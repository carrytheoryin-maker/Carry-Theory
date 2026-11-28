import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import { readDb, updateDb } from './server/db.ts';
import type { Enquiry, Order, OrderItem } from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

function sanitizeString(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

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

  const pageUrl = `${baseUrl}${cleanPath === '/' ? '/' : cleanPath}`;
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;

  return rawHtml
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
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '2mb' }));

  readDb();

  // Dynamic SEO Sitemap & Robots
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const db = readDb();
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const staticPaths = ['/', '/shop', '/about', '/contact'];
    const categoryPaths = db.categories.map((c) => `/collections/${c.slug}`);
    const productPaths = db.products.filter((p) => p.published).map((p) => `/products/${p.slug}`);
    const allPaths = [...staticPaths, ...categoryPaths, ...productPaths];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allPaths
      .map((p) => `  <url><loc>${baseUrl}${p}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Public Storefront Bootstrap
  app.get('/api/storefront', (_req: Request, res: Response) => {
    const db = readDb();
    res.json({
      siteConfig: db.siteConfig,
      categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      products: db.products.filter((p) => p.published),
      reviews: db.reviews.filter((r) => r.approved),
    });
  });

  // Newsletter Subscription
  app.post('/api/subscribers', (req: Request, res: Response) => {
    const email = sanitizeString(req.body?.email, 180).toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const result = updateDb((db) => {
      const existing = db.subscribers.find((s) => s.email === email);
      if (existing) {
        return { alreadySubscribed: true };
      }
      db.subscribers.unshift({
        id: `sub-${crypto.randomUUID()}`,
        email,
        createdAt: new Date().toISOString(),
      });
      return { alreadySubscribed: false };
    });
    res.status(201).json({
      ok: true,
      message: result.alreadySubscribed
        ? 'You are already subscribed to Carry Theory updates.'
        : 'Thank you for joining Carry Theory. Your email has been saved.',
    });
  });

  // Enquiries (Personalisation & Contact)
  app.post('/api/enquiries', (req: Request, res: Response) => {
    const body = req.body || {};
    const type: Enquiry['type'] = body.type === 'customisation' ? 'customisation' : 'contact';
    const fullName = sanitizeString(body.fullName, 140);
    const email = sanitizeString(body.email, 180);
    const phone = sanitizeString(body.phone, 40);
    const productInterest = sanitizeString(body.productInterest, 240);
    const customisationRequirements = sanitizeString(body.customisationRequirements, 1000);
    const message = sanitizeString(body.message, 2000);

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone) {
      res.status(400).json({ error: 'Please provide your full name, valid email address, and phone number.' });
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

    res.status(201).json({ ok: true, id: enquiry.id });
  });

  // Checkout & Orders (COD & UPI Payment with authoritative server-side price, ₹50 customisation fee & stock validation)
  app.post('/api/orders', (req: Request, res: Response) => {
    const body = req.body || {};
    const customerName = sanitizeString(body.customerName, 140);
    const email = sanitizeString(body.email, 180);
    const phone = sanitizeString(body.phone, 40);
    const address = sanitizeString(body.address, 400);
    const city = sanitizeString(body.city, 120);
    const state = sanitizeString(body.state, 120);
    const pinCode = sanitizeString(body.pinCode, 20);
    const paymentMode = body.paymentMode === 'upi' ? 'upi' : body.paymentMode === 'cod' ? 'cod' : null;
    const upiTransactionRef = sanitizeString(body.upiTransactionRef, 80);
    const customisationRequested = Boolean(body.customisationRequested);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!paymentMode) {
      res.status(400).json({ error: 'Please select Cash on Delivery or UPI Payment.' });
      return;
    }

    if (!customerName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !address || !city || !state || !/^\d{6}$/.test(pinCode)) {
      res.status(400).json({ error: 'Please complete all required shipping fields including a valid 6-digit PIN code.' });
      return;
    }

    if (rawItems.length === 0 || rawItems.length > 50) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const db = readDb();
    const verifiedItems: OrderItem[] = [];
    let hasCustomisableItem = false;

    for (const raw of rawItems) {
      const productId = sanitizeString(raw?.productId, 120);
      const variantId = sanitizeString(raw?.variantId, 120);
      const qty = Math.floor(Number(raw?.quantity));
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
        hasCustomisableItem = true;
      }

      if (product.variants.length > 0) {
        const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
        if (!variant || !variant.available || variant.stock < qty) {
          res.status(400).json({ error: `Insufficient stock for ${product.name} (${variant?.label || 'selected option'}).` });
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
    const applyCustomisation = customisationRequested && hasCustomisableItem;
    const customisationFee = applyCustomisation ? (db.siteConfig.customisationFeeInr || 50) : 0;
    const deliveryCharges =
      subtotal >= db.siteConfig.freeDeliveryThresholdInr ? 0 : db.siteConfig.deliveryFeeInr;
    const total = subtotal + customisationFee + deliveryCharges;

    const createdOrder = updateDb((dbState) => {
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

    res.status(201).json({ order: createdOrder });
  });

  // Vite dev middleware or static dist serving with dynamic Open Graph tag injection
  const isProd = process.env.NODE_ENV === 'production';
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
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      const distHtmlPath = path.join(distDir, 'index.html');
      const rawHtml = fs.readFileSync(distHtmlPath, 'utf8');
      res.status(200).set({ 'Content-Type': 'text/html' }).end(renderSeoHtml(rawHtml, req));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Carry Theory server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
