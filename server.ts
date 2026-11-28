import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { readDb, updateDb } from './server/db.ts';
import {
  blockExposedFilesMiddleware,
  createRateLimiter,
  forwardWebhookServerSide,
  hashAdminPasscode,
  isPlainObject,
  isValidEmail,
  isValidPhone,
  isValidPinCode,
  isValidUpiRef,
  requireAdminAuth,
  safeCompareStrings,
  sanitizeMultiLine,
  sanitizeSingleLine,
  securityHeadersMiddleware,
  signAdminToken,
  strictApiCorsMiddleware,
  stripDangerousKeys,
  verifyAdminPasscodeHash,
} from './server/security.ts';
import type { Enquiry, Order, OrderItem } from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderSeoHtml(rawHtml: string, req: Request): string {
  const db = readDb();
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const cleanPath = (req.path || '/').replace(/\/+$/, '') || '/';

  let title = 'Carry Theory | For Every Form.';
  let description =
    'Carry Theory crafts refined everyday essentials—insulated tumblers, travel mugs, MagSafe wallets, and smart desk clocks designed for every form.';
  let imagePath =
    db.siteConfig.heroImageUrl ||
    '/assets/aistudio/Warm_Studio_Still_Life_with_Tumblers_and_Mugs_2d1e9d8f.png';

  const productMatch = cleanPath.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = db.products.find((p) => p.slug === productMatch[1] && p.published);
    if (product) {
      title = `${product.name} — Carry Theory`;
      description = product.shortDescription || description;
      if (product.images[0]?.url) {
        imagePath = product.images[0].url;
      }
    }
  }

  const isHiddenRoute = cleanPath === '/admin' || cleanPath.startsWith('/admin/');
  const pageUrl = `${baseUrl}${cleanPath === '/' ? '/' : cleanPath}`;
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;

  let html = rawHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeHtmlAttr(pageUrl)}" />`
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${escapeHtmlAttr(pageUrl)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+property="og:image"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />`
    )
    .replace(
      /<meta\s+property="og:image:secure_url"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta property="og:image:secure_url" content="${escapeHtmlAttr(imageUrl)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"[\s\S]*?content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`
    )
    .replace(/"url":\s*"https:\/\/carrytheory\.in\/"/, `"url": "${escapeHtmlAttr(`${baseUrl}/`)}"`);

  if (isHiddenRoute) {
    html = html.replace(
      '</head>',
      '  <meta name="robots" content="noindex, nofollow" />\n  </head>'
    );
  }
  return html;
}

const ALLOWED_FULFILMENT_STATUSES = new Set<Order['fulfilmentStatus']>([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(blockExposedFilesMiddleware);
  app.use(securityHeadersMiddleware(isProd));
  app.use(express.json({ limit: '64kb' }));

  // Fast WebP image negotiation + browser cache headers for static /assets/*
  const publicAssetsDir = path.resolve(process.cwd(), 'public', 'assets');
  const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
  app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('image/webp') && /\.(png|jpe?g)$/i.test(req.path)) {
      const relPath = req.path.replace(/^\/+/, '').replace(/\.(png|jpe?g)$/i, '.webp');
      const baseDir = isProd && fs.existsSync(distAssetsDir) ? distAssetsDir : publicAssetsDir;
      const candidate = path.resolve(baseDir, relPath);
      if (candidate.startsWith(baseDir + path.sep) && fs.existsSync(candidate)) {
        res.setHeader('Vary', 'Accept');
        res.type('image/webp');
        res.sendFile(candidate);
        return;
      }
    }
    next();
  });

  readDb();

  const generalApiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 150,
    message: 'Too many requests from this network. Please try again in a few minutes.',
  });

  const writeFormLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many submissions detected. Please wait a moment before trying again.',
  });

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 8,
    message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
  });

  app.use('/api', strictApiCorsMiddleware, generalApiLimiter);

  // Enforce JSON Content-Type on API write routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Requests must use application/json Content-Type.' });
      return;
    }
    next();
  });

  // Dynamic SEO Sitemap & Robots (explicitly disallow hidden/admin/api routes)
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl}/sitemap.xml\n`
      );
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const db = readDb();
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const staticPaths = ['/', '/shop', '/about', '/contact'];
    const categoryPaths = db.categories.map((c) => `/collections/${c.slug}`);
    const productPaths = db.products.filter((p) => p.published).map((p) => `/products/${p.slug}`);
    const allPaths = [...staticPaths, ...categoryPaths, ...productPaths];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allPaths
      .map((p) => `  <url><loc>${escapeHtmlAttr(`${baseUrl}${p}`)}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Public Storefront Bootstrap (strictly public catalog & config — zero PII or credentials)
  app.get('/api/storefront', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    const db = readDb();
    res.json({
      siteConfig: db.siteConfig,
      categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      products: db.products.filter((p) => p.published),
      reviews: db.reviews.filter((r) => r.approved),
    });
  });

  // Newsletter Subscription
  app.post('/api/subscribers', writeFormLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isPlainObject(req.body)) {
        res.status(400).json({ error: 'Invalid request payload.' });
        return;
      }
      const body = stripDangerousKeys(req.body);
      const email = sanitizeSingleLine(body.email, 180).toLowerCase();
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const result = updateDb((db) => {
        const existing = db.subscribers.find((s) => s.email === email);
        if (existing) {
          return { alreadySubscribed: true, timestamp: existing.createdAt };
        }
        const createdAt = new Date().toISOString();
        db.subscribers.unshift({
          id: `sub-${crypto.randomUUID()}`,
          email,
          createdAt,
        });
        return { alreadySubscribed: false, timestamp: createdAt };
      });

      const syncedServerSide = !result.alreadySubscribed
        ? await forwardWebhookServerSide({
            type: 'subscriber',
            timestamp: result.timestamp,
            email,
          })
        : false;

      res.status(201).json({
        ok: true,
        syncedServerSide,
        message: result.alreadySubscribed
          ? 'You are already subscribed to Carry Theory updates.'
          : 'Thank you for joining Carry Theory. Your email has been saved.',
      });
    } catch (err) {
      next(err);
    }
  });

  // Enquiries (Personalisation & Contact)
  app.post('/api/enquiries', writeFormLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isPlainObject(req.body)) {
        res.status(400).json({ error: 'Invalid request payload.' });
        return;
      }
      const body = stripDangerousKeys(req.body);
      const type: Enquiry['type'] = body.type === 'customisation' ? 'customisation' : 'contact';
      const fullName = sanitizeSingleLine(body.fullName, 140);
      const email = sanitizeSingleLine(body.email, 180).toLowerCase();
      const phone = sanitizeSingleLine(body.phone, 25);
      const productInterest = sanitizeSingleLine(body.productInterest, 240);
      const customisationRequirements = sanitizeMultiLine(body.customisationRequirements, 1000);
      const message = sanitizeMultiLine(body.message, 2000);

      if (!fullName || !isValidEmail(email) || !isValidPhone(phone)) {
        res.status(400).json({
          error: 'Please provide your full name, valid email address, and valid phone number.',
        });
        return;
      }
      if (type === 'contact' && !message) {
        res.status(400).json({ error: 'Please enter your message.' });
        return;
      }

      const enquiry: Enquiry = {
        id: `enq-${crypto.randomUUID()}`,
        type,
        fullName,
        company: '',
        email,
        phone,
        productInterest,
        estimatedQuantity: '',
        customisationRequirements,
        message,
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      updateDb((db) => {
        db.enquiries.unshift(enquiry);
      });

      const syncedServerSide = await forwardWebhookServerSide({
        type: 'enquiry',
        enquiryType: enquiry.type,
        timestamp: enquiry.createdAt,
        fullName: enquiry.fullName,
        email: enquiry.email,
        phone: enquiry.phone,
        productInterest: enquiry.productInterest,
        customisationRequirements: enquiry.customisationRequirements,
        message: enquiry.message,
      });

      res.status(201).json({ ok: true, id: enquiry.id, syncedServerSide });
    } catch (err) {
      next(err);
    }
  });

  // Checkout & Orders (Authoritative server-side pricing, ₹50 customisation fee, stock & input validation)
  app.post('/api/orders', writeFormLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.setHeader('Cache-Control', 'no-store, private');
    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'Invalid order payload.' });
      return;
    }
    const body = stripDangerousKeys(req.body);
    const customerName = sanitizeSingleLine(body.customerName, 140);
    const email = sanitizeSingleLine(body.email, 180).toLowerCase();
    const phone = sanitizeSingleLine(body.phone, 25);
    const address = sanitizeMultiLine(body.address, 400);
    const city = sanitizeSingleLine(body.city, 120);
    const state = sanitizeSingleLine(body.state, 120);
    const pinCode = sanitizeSingleLine(body.pinCode, 10);
    const paymentMode = body.paymentMode === 'upi' ? 'upi' : body.paymentMode === 'cod' ? 'cod' : null;
    const upiTransactionRef = sanitizeSingleLine(body.upiTransactionRef, 80);
    const customisationRequested = body.customisationRequested === true;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!paymentMode) {
      res.status(400).json({ error: 'Please select Cash on Delivery or UPI Payment.' });
      return;
    }

    if (
      !customerName ||
      !isValidEmail(email) ||
      !isValidPhone(phone) ||
      !address ||
      !city ||
      !state ||
      !isValidPinCode(pinCode)
    ) {
      res.status(400).json({
        error: 'Please complete all required shipping fields including a valid email, phone number, and 6-digit PIN code.',
      });
      return;
    }

    if (paymentMode === 'upi' && !isValidUpiRef(upiTransactionRef)) {
      res.status(400).json({ error: 'Please enter a valid UPI transaction reference.' });
      return;
    }

    if (rawItems.length === 0 || rawItems.length > 50) {
      res.status(400).json({ error: 'Your cart is empty or exceeds maximum item lines.' });
      return;
    }

    const db = readDb();
    const verifiedItems: OrderItem[] = [];
    let customisableUnits = 0;

    for (const raw of rawItems) {
      if (!isPlainObject(raw)) {
        res.status(400).json({ error: 'Invalid item format in cart.' });
        return;
      }
      const cleanRaw = stripDangerousKeys(raw);
      const productId = sanitizeSingleLine(cleanRaw.productId, 120);
      const variantId = sanitizeSingleLine(cleanRaw.variantId, 120);
      const qty = Math.floor(Number(cleanRaw.quantity));
      if (!productId || !Number.isFinite(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: 'Invalid item quantity in cart.' });
        return;
      }
      const product = db.products.find((p) => p.id === productId && p.published);
      if (!product) {
        res.status(400).json({ error: 'One or more selected products are no longer available.' });
        return;
      }
      if (product.customisable) {
        customisableUnits += qty;
      }

      if (product.variants.length > 0) {
        const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
        if (!variant || !variant.available || variant.stock < qty) {
          res.status(400).json({
            error: `Insufficient stock for ${product.name} (${variant?.label || 'selected option'}).`,
          });
          return;
        }
        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantLabel: variant.label,
          sku: variant.sku,
          price: variant.price,
          quantity: qty,
          image: variant.imageUrl || product.images[0]?.url || '',
        });
      } else {
        if (product.stock < qty) {
          res.status(400).json({ error: `Insufficient stock for ${product.name}.` });
          return;
        }
        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: product.price,
          quantity: qty,
          image: product.images[0]?.url || '',
        });
      }
    }

    const subtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const applyCustomisation = customisationRequested && customisableUnits > 0;
    const customFeePerUnit = db.siteConfig.customisationFeeInr || 50;
    const customisationFee = applyCustomisation ? customisableUnits * customFeePerUnit : 0;
    const deliveryCharges =
      subtotal >= db.siteConfig.freeDeliveryThresholdInr ? 0 : db.siteConfig.deliveryFeeInr;
    const total = subtotal + customisationFee + deliveryCharges;

    const createdOrder = updateDb((dbState) => {
      // Re-verify live stock atomically before mutating state
      for (const item of verifiedItems) {
        const prod = dbState.products.find((p) => p.id === item.productId && p.published);
        if (!prod) {
          throw new Error('PRODUCT_UNAVAILABLE');
        }
        if (item.variantId) {
          const v = prod.variants.find((vr) => vr.id === item.variantId);
          if (!v || !v.available || v.stock < item.quantity) {
            throw new Error('INSUFFICIENT_STOCK');
          }
        } else if (prod.stock < item.quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }
      }

      dbState.orderCounter += 1;
      const orderNumber = `CT-2026-${dbState.orderCounter}`;
      const order: Order = {
        id: `ord-${crypto.randomUUID()}`,
        orderNumber,
        customerName,
        email,
        phone,
        address,
        city,
        state,
        pinCode,
        items: verifiedItems,
        subtotal,
        customisationRequested: applyCustomisation,
        customisationFee,
        deliveryCharges,
        total,
        paymentMode,
        paymentStatus: paymentMode === 'cod' ? 'cod_pending' : 'upi_pending_verification',
        ...(paymentMode === 'upi' && upiTransactionRef ? { upiTransactionRef } : {}),
        fulfilmentStatus: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      for (const item of verifiedItems) {
        const prod = dbState.products.find((p) => p.id === item.productId);
        if (prod) {
          if (item.variantId) {
            const v = prod.variants.find((vr) => vr.id === item.variantId);
            if (v) {
              v.stock = Math.max(0, v.stock - item.quantity);
              if (v.stock === 0) v.available = false;
            }
            prod.stock = prod.variants.reduce((acc, vr) => acc + vr.stock, 0);
          } else {
            prod.stock = Math.max(0, prod.stock - item.quantity);
          }
        }
      }

      dbState.orders.unshift(order);
      return order;
    });

    const itemsSummary = createdOrder.items
      .map(
        (item) =>
          `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''} x${item.quantity} [INR ${item.price}]`
      )
      .join(' | ');

    const syncedServerSide = await forwardWebhookServerSide({
      type: 'order',
      timestamp: createdOrder.createdAt,
      orderNumber: createdOrder.orderNumber,
      customerName: createdOrder.customerName,
      email: createdOrder.email,
      phone: createdOrder.phone,
      address: createdOrder.address,
      city: createdOrder.city,
      state: createdOrder.state,
      pinCode: createdOrder.pinCode,
      itemsSummary,
      subtotal: createdOrder.subtotal,
      customisationRequested: createdOrder.customisationRequested ? 'Yes' : 'No',
      customisationFee: createdOrder.customisationFee,
      deliveryCharges: createdOrder.deliveryCharges,
      total: createdOrder.total,
      paymentMode: createdOrder.paymentMode === 'upi' ? 'UPI' : 'Cash on Delivery',
      paymentStatus: createdOrder.paymentStatus,
      upiTransactionRef: createdOrder.upiTransactionRef || '',
    });

      res.status(201).json({ order: createdOrder, syncedServerSide });
    } catch (err) {
      next(err);
    }
  });

  // Hidden Admin Authentication & Management API
  app.get('/api/admin/status', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    const db = readDb();
    res.json({
      configured: Boolean(envPasscode || db.adminCredential?.hash),
    });
  });

  app.post('/api/admin/setup', authLimiter, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'Invalid setup payload.' });
      return;
    }
    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    const db = readDb();
    if (envPasscode || db.adminCredential?.hash) {
      res.status(403).json({ error: 'Admin passcode is already configured.' });
      return;
    }
    const passcode = typeof req.body.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 10 || passcode.length > 128) {
      res.status(400).json({ error: 'Choose an admin passcode between 10 and 128 characters.' });
      return;
    }

    const cred = hashAdminPasscode(passcode);
    updateDb((state) => {
      state.adminCredential = cred;
    });
    const session = signAdminToken();
    res.status(201).json(session);
  });

  app.post('/api/admin/login', authLimiter, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'Invalid login payload.' });
      return;
    }
    const passcode = typeof req.body.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode || passcode.length > 128) {
      res.status(400).json({ error: 'Please enter your admin passcode.' });
      return;
    }

    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    const db = readDb();

    let authenticated = false;
    if (envPasscode) {
      authenticated = safeCompareStrings(passcode, envPasscode);
    } else if (db.adminCredential?.hash) {
      authenticated = verifyAdminPasscodeHash(passcode, db.adminCredential);
    } else {
      res.status(403).json({ error: 'Admin passcode has not been set up yet.' });
      return;
    }

    if (!authenticated) {
      res.status(401).json({ error: 'Invalid admin passcode.' });
      return;
    }

    const session = signAdminToken();
    res.json(session);
  });

  app.get('/api/admin/overview', requireAdminAuth, (_req: Request, res: Response) => {
    const db = readDb();
    res.json({
      orders: db.orders,
      enquiries: db.enquiries,
      subscribers: db.subscribers,
    });
  });

  app.patch('/api/admin/orders/:id', requireAdminAuth, (req: Request, res: Response) => {
    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'Invalid update payload.' });
      return;
    }
    const orderId = sanitizeSingleLine(req.params.id, 120);
    const nextStatus = sanitizeSingleLine(req.body.fulfilmentStatus, 32) as Order['fulfilmentStatus'];
    if (!orderId || !ALLOWED_FULFILMENT_STATUSES.has(nextStatus)) {
      res.status(400).json({ error: 'Invalid order ID or fulfilment status.' });
      return;
    }

    const updated = updateDb((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) return null;
      order.fulfilmentStatus = nextStatus;
      return order;
    });

    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: updated });
  });

  // Reject any unknown /api/* routes with clean 404 JSON
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Vite dev middleware or static dist serving with dynamic Open Graph tag injection
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req: Request, res: Response, next) => {
      if (path.extname(req.path)) {
        next();
        return;
      }
      try {
        const templatePath = path.resolve(process.cwd(), 'index.html');
        const rawTemplate = fs.readFileSync(templatePath, 'utf8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const finalHtml = renderSeoHtml(transformed, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false, maxAge: '7d' }));
    app.get('*', (req: Request, res: Response) => {
      const distHtmlPath = path.join(distDir, 'index.html');
      const rawHtml = fs.readFileSync(distHtmlPath, 'utf8');
      res.status(200).set({ 'Content-Type': 'text/html' }).end(renderSeoHtml(rawHtml, req));
    });
  }

  // Global error handler — never leak debug stack traces or internal errors to clients
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON request.' });
      return;
    }
    if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
      res.status(409).json({ error: 'One or more items just sold out. Please refresh your cart.' });
      return;
    }
    if (err instanceof Error && err.message === 'PRODUCT_UNAVAILABLE') {
      res.status(400).json({ error: 'One or more selected products are no longer available.' });
      return;
    }
    console.error('Unhandled server error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'An unexpected error occurred. Please try again shortly.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Carry Theory server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : 'Startup failure');
  process.exit(1);
});
