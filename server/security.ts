import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface AdminCredential {
  salt: string;
  hash: string;
  updatedAt: string;
}

export interface AdminTokenPayload {
  sub: 'admin';
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Strips control characters and HTML angle brackets from user-submitted single-line strings.
 */
export function sanitizeSingleLine(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Strips unsafe control characters and HTML angle brackets while preserving intentional newlines.
 */
export function sanitizeMultiLine(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 180 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()-]{7,25}$/.test(phone);
}

export function isValidPinCode(pinCode: string): boolean {
  return /^\d{6}$/.test(pinCode);
}

export function isValidUpiRef(ref: string): boolean {
  if (!ref) return true;
  return /^[a-zA-Z0-9._:/-]{4,80}$/.test(ref);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Prevents prototype pollution when reading untrusted JSON payloads.
 */
export function stripDangerousKeys<T extends Record<string, unknown>>(obj: T): T {
  const blocked = new Set(['__proto__', 'constructor', 'prototype']);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!blocked.has(k)) {
      clean[k] = v;
    }
  }
  return clean as T;
}

/**
 * Constant-time SHA-256 string comparison for secrets.
 */
export function safeCompareStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function hashAdminPasscode(passcode: string): AdminCredential {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return {
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  };
}

export function verifyAdminPasscodeHash(passcode: string, cred: AdminCredential): boolean {
  if (!cred?.salt || !cred?.hash) return false;
  try {
    const derived = crypto.scryptSync(passcode, cred.salt, 64);
    const stored = Buffer.from(cred.hash, 'hex');
    if (derived.length !== stored.length) return false;
    return crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

export function signAdminToken(): { token: string; expiresAt: string } {
  const now = Date.now();
  const exp = now + SESSION_TTL_MS;
  const payload: AdminTokenPayload = {
    sub: 'admin',
    iat: now,
    exp,
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return {
    token: `${encoded}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const bufA = Buffer.from(providedSig, 'utf8');
  const bufB = Buffer.from(expectedSig, 'utf8');
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (payload.sub !== 'admin' || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store, private');
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }
  next();
}

/**
 * In-memory sliding-window rate limiter per client IP.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const hits = new Map<string, number[]>();

  // Periodic cleanup to avoid unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, Math.min(options.windowMs, 5 * 60 * 1000));
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const recent = (hits.get(ip) || []).filter((t) => t > cutoff);

    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - recent.length)));

    if (recent.length >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((recent[0] + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: options.message });
      return;
    }

    recent.push(now);
    hits.set(ip, recent);
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - recent.length)));
    next();
  };
}

/**
 * Strict security headers middleware compatible with embedded AI Studio iframe previews.
 */
export function securityHeadersMiddleware(isProd: boolean) {
  const connectSrc = isProd
    ? "'self' https://script.google.com https://script.googleusercontent.com"
    : "'self' ws: wss: https://script.google.com https://script.googleusercontent.com";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.usercontent.goog",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' 'unsafe-inline'`,
    `connect-src ${connectSrc}`,
    "form-action 'self'",
  ].join('; ');

  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', csp);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

/**
 * Strict same-origin + allowlisted CORS enforcement for /api/* routes (no wildcard on mutations/auth).
 */
export function strictApiCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  const host = req.get('host');
  const proto = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = new Set<string>(configuredOrigins);
  if (host) {
    allowedOrigins.add(`${proto}://${host}`);
    allowedOrigins.add(`https://${host}`);
    allowedOrigins.add(`http://${host}`);
  }
  if (process.env.APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.APP_URL).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (!allowedOrigins.has(normalizedOrigin)) {
    res.status(403).json({ error: 'Cross-origin request denied.' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

/**
 * Blocks direct HTTP access to hidden dotfiles, runtime DB directory, server modules, and config files.
 */
export function blockExposedFilesMiddleware(req: Request, res: Response, next: NextFunction): void {
  const decodedPath = (() => {
    try {
      return decodeURIComponent(req.path || '/');
    } catch {
      return req.path || '/';
    }
  })();

  const sensitivePattern =
    /^\/(\.env|\.git|data(\/|$)|server(\/|$)|server\.ts$|google-apps-script(\/|$)|package\.json$|bun\.lock$|tsconfig\.json$|vercel\.json$|vite\.config\.ts$|metadata\.json$|walkthrough\.md$|assets\/.*\.csv$)/i;

  if (sensitivePattern.test(decodedPath) || decodedPath.includes('..')) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  next();
}

/**
 * SSRF-guarded outbound Google Apps Script webhook forwarder (runs server-side when GOOGLE_SCRIPT_WEBHOOK_URL is set).
 */
export async function forwardWebhookServerSide(payload: Record<string, unknown>): Promise<boolean> {
  const rawUrl = (process.env.GOOGLE_SCRIPT_WEBHOOK_URL || '').trim();
  if (!rawUrl) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const allowedHosts = ['script.google.com', 'script.googleusercontent.com'];
  const isAllowedHost = allowedHosts.some(
    (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
  );
  if (parsed.protocol !== 'https:' || !isAllowedHost) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(parsed.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
