import fs from 'node:fs';
import path from 'node:path';
import type {
  Category,
  Enquiry,
  Order,
  Product,
  Review,
  SiteConfig,
  Subscriber,
} from '../src/types.ts';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_REVIEWS,
  DEFAULT_SITE_CONFIG,
} from './seed.ts';

const CURRENT_CATALOG_VERSION = 6;

export interface DatabaseState {
  catalogVersion?: number;
  siteConfig: SiteConfig;
  categories: Category[];
  products: Product[];
  reviews: Review[];
  enquiries: Enquiry[];
  orders: Order[];
  subscribers: Subscriber[];
  orderCounter: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'carry-theory-db.json');

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function buildInitialState(): DatabaseState {
  return {
    catalogVersion: CURRENT_CATALOG_VERSION,
    siteConfig: structuredClone(DEFAULT_SITE_CONFIG),
    categories: structuredClone(DEFAULT_CATEGORIES),
    products: structuredClone(DEFAULT_PRODUCTS),
    reviews: structuredClone(DEFAULT_REVIEWS),
    enquiries: [],
    orders: [],
    subscribers: [],
    orderCounter: 1000,
  };
}

let cachedState: DatabaseState | null = null;

export function readDb(): DatabaseState {
  ensureDirs();
  if (cachedState) {
    return cachedState;
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = buildInitialState();
    writeDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    const initial = buildInitialState();
    const isCatalogCurrent = parsed.catalogVersion === CURRENT_CATALOG_VERSION;

    const merged: DatabaseState = {
      catalogVersion: CURRENT_CATALOG_VERSION,
      siteConfig: initial.siteConfig,
      categories:
        isCatalogCurrent && Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : initial.categories,
      products:
        isCatalogCurrent && Array.isArray(parsed.products) && parsed.products.length > 0
          ? parsed.products
          : initial.products,
      reviews:
        isCatalogCurrent && Array.isArray(parsed.reviews) && parsed.reviews.length > 0
          ? parsed.reviews
          : initial.reviews,
      enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      orderCounter: typeof parsed.orderCounter === 'number' ? parsed.orderCounter : 1000,
    };

    if (!isCatalogCurrent) {
      writeDb(merged);
    } else {
      cachedState = merged;
    }
    return merged;
  } catch {
    const initial = buildInitialState();
    writeDb(initial);
    return initial;
  }
}

export function writeDb(state: DatabaseState): void {
  ensureDirs();
  cachedState = state;
  const tmpFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function updateDb<T>(mutator: (state: DatabaseState) => T): T {
  const state = readDb();
  const result = mutator(state);
  writeDb(state);
  return result;
}
