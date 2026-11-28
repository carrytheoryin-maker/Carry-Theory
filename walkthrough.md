# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 8

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Client-Exposed Webhook Variable | `.env.example` | 12 | The Google Apps Script webhook URL used a `VITE_` browser prefix, exposing the endpoint configuration to client bundles. | Medium | Fixed | Replaced `VITE_GOOGLE_SCRIPT_WEBHOOK_URL` with server-side `GOOGLE_SCRIPT_WEBHOOK_URL` and added `ADMIN_PASSCODE` and `CORS_ORIGIN` in `.env.example`, forwarding submissions securely from `server.ts`. |
| Missing Admin Authentication & Hidden Route Controls | `server.ts` | 530 | There was no authenticated administrative console or role boundary for inspecting orders, enquiries, and subscribers or updating fulfilment statuses. | High | Fixed | Added `/admin` (unlinked in navigation and tagged `noindex, nofollow`), scrypt passcode hashing, one-time initial passcode claim (`/api/admin/setup`), HMAC-SHA256 Bearer session verification (`requireAdminAuth`), and in-memory-only client session tokens in `src/pages/AdminPage.tsx`. |
| Missing Rate Limiting & Request Guards | `server.ts` | 143 | Public POST endpoints (`/api/orders`, `/api/enquiries`, `/api/subscribers`) had no request rate limiting, JSON payload size cap, or Content-Type enforcement. | Medium | Fixed | Added per-IP sliding-window rate limiters (`generalApiLimiter`, `writeFormLimiter`, `authLimiter`), `64kb` body limits, `application/json` enforcement, and prototype-pollution key stripping (`stripDangerousKeys`). |
| Missing CORS Allowlist | `server/security.ts` | 271 | API routes lacked strict cross-origin validation, leaving mutations unprotected against unexpected cross-site origins. | Medium | Fixed | Enforced `strictApiCorsMiddleware` on `/api/*`, validating browser `Origin` against the current host, `APP_URL`, and `CORS_ORIGIN` (returning `403` for untrusted origins and never using `*`). |
| Unsanitized Form Inputs & URL Rendering | `src/utils/sanitize.ts`, `src/components/SafeImage.tsx` | 6 | Order, enquiry, and newsletter forms accepted raw strings with angle brackets/control chars, and image URLs were not scheme-validated before rendering. | Medium | Fixed | Added client/server sanitization (`sanitizeText`, `sanitizeMultilineText`, `sanitizeSingleLine`, `sanitizeMultiLine`), field format validation (email, phone, 6-digit PIN, UPI reference), and `isSafeUrl` guarding image sources. |
| Spreadsheet Formula Injection | `google-apps-script/Code.gs` | 6 | Customer-supplied fields written directly to Google Sheets could be interpreted as active spreadsheet formulas if starting with `=`, `+`, `-`, or `@`. | Medium | Fixed | Added `safeCell()` to strip unsafe control characters and prefix formula-trigger characters (`=`, `+`, `-`, `@`, tab, carriage return) with `'` on all appended rows. |
| Missing Security Headers & Debug Hardening | `server.ts`, `vite.config.ts` | 134 | Responses lacked `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options`, while `X-Powered-By` was enabled and uncaught async throws risked leaking errors. | Medium | Fixed | Disabled `x-powered-by`, disabled production `sourcemap` in `vite.config.ts`, added `securityHeadersMiddleware` and `vercel.json` headers, added global sanitized error handling, and wrapped async routes cleanly. |
| Direct Access to Sensitive Files & Data | `server/security.ts`, `.gitignore` | 321 | Without explicit middleware guards and git exclusions, `data/` runtime records, `.env*`, and server source files could be accessed or accidentally tracked. | High | Fixed | Added `blockExposedFilesMiddleware` returning `404` for dotfiles, `data/`, `server/`, `server.ts`, `google-apps-script/`, config files, and `..` traversal, and added `data/` to `.gitignore`. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Dependency Audit | `package.json`, `bun.lock` | `bun audit` completed with 0 known vulnerabilities across all 227 installed packages. |
| Authoritative Pricing & Stock | `server.ts` | Checkout totals, delivery charges, and ₹50 customisation fees are computed solely on the server from catalog records, with atomic stock verification inside `updateDb`. |
| Server-Side Webhook Forwarding | `server/security.ts` | `forwardWebhookServerSide` permits only `https:` requests to `script.google.com` or `script.googleusercontent.com` with a 5-second abort timeout. |
| XSS & HTML Escaping | `server.ts`, `src/` | React renders text safely without `dangerouslySetInnerHTML`, `innerHTML`, or `eval`; dynamic Open Graph meta values are escaped via `escapeHtmlAttr`. |
| Preview Frame Compatibility | `server/security.ts` | `Content-Security-Policy` restricts `frame-ancestors` to `'self'` and Google AI Studio preview origins rather than blocking embedded previews. |

## PoC Verification

### Unauthenticated Admin Data & Action Access
#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Authentication & Role Access Control |
| Impact | High |
| Affected File | `server.ts:591-624`, `server/security.ts:164-178` |
| Test Scenario | Unauthenticated `GET /api/admin/overview` and `PATCH /api/admin/orders/<id>` requests without a valid `Authorization: Bearer <token>` header |

#### How It Was Fixed
Protected all administrative read and order-mutation endpoints with `requireAdminAuth`, backed by HMAC-SHA256 signed session tokens and constant-time or scrypt-verified passcodes.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request reaches `GET /api/admin/overview` in `server.ts:591` | Invokes `requireAdminAuth` middleware |
| 2 | `requireAdminAuth` in `server/security.ts:166-176` checks for `Bearer ` token and verifies signature & expiry via `verifyAdminToken` | Missing or tampered token fails verification |
| 3 | Middleware responds with HTTP `401` and `Cache-Control: no-store, private` | **Handled Safely** |

#### Conclusion
**Fix Verified** - No customer order, enquiry, or subscriber PII can be read or modified without an authenticated admin session token.

---

### Untrusted Form Input, XSS & Formula Injection
#### Summary
| Field | Value |
|---|---|
| Issue Type | Cross-Site Scripting & Spreadsheet Formula Injection |
| Impact | Medium |
| Affected File | `server/security.ts:24-45`, `google-apps-script/Code.gs:6-12` |
| Test Scenario | Submitting `<img src=x onerror=alert(1)>` or `=HYPERLINK("http://evil.example","Click")` in the checkout name or contact message field |

#### How It Was Fixed
Both client forms (`CheckoutPage.tsx`, `ContactPage.tsx`, `QuickEnquiryModal.tsx`, `HomePage.tsx`) and server endpoints strip control bytes and `<` / `>` characters before persistence, React escapes all rendered text, and `safeCell()` neutralizes spreadsheet formula triggers.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Payload arrives at `POST /api/enquiries` in `server.ts:251` | Passed through `stripDangerousKeys` |
| 2 | `sanitizeSingleLine` / `sanitizeMultiLine` in `server/security.ts:24-45` strip control chars and `<` `>` | Script tags/brackets removed |
| 3 | `safeCell()` in `google-apps-script/Code.gs:6-12` detects leading `=` and prepends `'` | **Handled Safely** |

#### Conclusion
**Fix Verified** - Injected HTML markup cannot execute in browsers and leading formula operators are rendered as literal text in spreadsheets.

---

### Disallowed Cross-Origin API Requests & Rate Abuse
#### Summary
| Field | Value |
|---|---|
| Issue Type | Permissive CORS & Unthrottled Public Endpoints |
| Impact | Medium |
| Affected File | `server/security.ts:183-225,271-316`, `server.ts:143-162` |
| Test Scenario | Cross-origin `OPTIONS /api/orders` with `Origin: https://evil.example` and rapid bursts exceeding 8 requests to `/api/admin/login` |

#### How It Was Fixed
Added `strictApiCorsMiddleware` checking `Origin` against allowed hosts (`host`, `APP_URL`, `CORS_ORIGIN`) and per-IP sliding-window rate limiters (`generalApiLimiter`, `writeFormLimiter`, `authLimiter`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request enters `/api` middleware chain at `server.ts:161` | Runs `strictApiCorsMiddleware` |
| 2 | Origin `https://evil.example` is absent from `allowedOrigins` (`server/security.ts:300`) | Responds HTTP `403` immediately |
| 3 | Same-origin auth attempts > 8 within 15 minutes hit `authLimiter` (`server.ts:155-159`) | Responds HTTP `429` with `Retry-After` — **Handled Safely** |

#### Conclusion
**Fix Verified** - Untrusted third-party origins are rejected before reaching handlers and brute-force/spam bursts are throttled.

---

### Exposed Dotfiles, Database & Server Source Access
#### Summary
| Field | Value |
|---|---|
| Issue Type | Sensitive File & Directory Exposure |
| Impact | High |
| Affected File | `server/security.ts:321-338`, `vite.config.ts:31-35` |
| Test Scenario | Direct HTTP `GET /.env`, `GET /data/carry-theory-db.json`, `GET /server.ts`, or `GET /package.json` |

#### How It Was Fixed
Mounted `blockExposedFilesMiddleware` ahead of Vite/static middlewares to intercept sensitive paths and `..` segments with a plain `404 Not Found`, and disabled Vite production source maps (`sourcemap: false`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request hits Express app middleware stack at `server.ts:137` | Runs `blockExposedFilesMiddleware` |
| 2 | `sensitivePattern` in `server/security.ts:330-333` matches `/.env`, `/data/`, `/server.ts`, `/package.json`, or `..` | Short-circuits before Vite or static files |
| 3 | Responds HTTP `404 Not Found` | **Handled Safely** |

#### Conclusion
**Fix Verified** - Environment files, runtime JSON data files, server code, and configuration files cannot be downloaded over HTTP.
