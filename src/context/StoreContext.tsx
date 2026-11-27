import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_REVIEWS,
  DEFAULT_SITE_CONFIG,
} from '../data/catalog';
import type {
  CartItem,
  Category,
  Product,
  ProductVariant,
  Review,
  SiteConfig,
  StorefrontBootstrap,
} from '../types';

interface StockOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface StoreContextValue {
  loading: boolean;
  error: string | null;
  siteConfig: SiteConfig | null;
  categories: Category[];
  products: Product[];
  reviews: Review[];
  refreshStorefront: () => Promise<void>;
  decrementLocalStock: (items: StockOrderItem[]) => void;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number, openDrawer?: boolean) => void;
  updateCartQty: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = 'carry_theory_cart_v1';
const LOCAL_STOCK_STORAGE_KEY = 'carry_theory_local_stock_v2';

const StoreContext = createContext<StoreContextValue | null>(null);

function loadPersistedCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalStockMap(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(LOCAL_STOCK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function applyLocalStock(productsList: Product[]): Product[] {
  const stockMap = loadLocalStockMap();
  if (Object.keys(stockMap).length === 0) return productsList;

  return productsList.map((product) => {
    if (product.variants.length > 0) {
      const updatedVariants = product.variants.map((variant) => {
        const key = `${product.id}::${variant.id}`;
        const savedStock = stockMap[key];
        if (typeof savedStock === 'number') {
          const nextStock = Math.max(0, savedStock);
          return {
            ...variant,
            stock: nextStock,
            available: variant.available && nextStock > 0,
          };
        }
        return variant;
      });
      const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
      return {
        ...product,
        variants: updatedVariants,
        stock: totalStock,
      };
    }

    const savedProductStock = stockMap[product.id];
    if (typeof savedProductStock === 'number') {
      return {
        ...product,
        stock: Math.max(0, savedProductStock),
      };
    }
    return product;
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(DEFAULT_SITE_CONFIG);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() =>
    applyLocalStock(DEFAULT_PRODUCTS.filter((p) => p.published))
  );
  const [reviews, setReviews] = useState<Review[]>(() =>
    DEFAULT_REVIEWS.filter((r) => r.approved)
  );

  const [cart, setCart] = useState<CartItem[]>(loadPersistedCart);
  const [cartOpen, setCartOpen] = useState(false);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return;
      }
      const data = (await res.json()) as StorefrontBootstrap;
      if (data?.siteConfig && Array.isArray(data.products) && Array.isArray(data.categories)) {
        setSiteConfig(data.siteConfig);
        setCategories(data.categories);
        setProducts(data.products);
        setReviews(Array.isArray(data.reviews) ? data.reviews : DEFAULT_REVIEWS);
        setError(null);
      }
    } catch {
      // Running in static/offline mode (e.g., Vercel static deployment); bundled defaults remain active
    }
  }, []);

  useEffect(() => {
    void refreshStorefront();
  }, [refreshStorefront]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota issues gracefully
    }
  }, [cart]);

  const decrementLocalStock = useCallback((items: StockOrderItem[]) => {
    setProducts((prevProducts) => {
      const stockMap = loadLocalStockMap();
      const nextProducts = prevProducts.map((product) => {
        const matchingItems = items.filter((item) => item.productId === product.id);
        if (matchingItems.length === 0) return product;

        if (product.variants.length > 0) {
          const updatedVariants = product.variants.map((variant) => {
            const qty = matchingItems
              .filter((m) => m.variantId === variant.id)
              .reduce((sum, m) => sum + m.quantity, 0);
            if (qty <= 0) return variant;
            const nextStock = Math.max(0, variant.stock - qty);
            stockMap[`${product.id}::${variant.id}`] = nextStock;
            return {
              ...variant,
              stock: nextStock,
              available: variant.available && nextStock > 0,
            };
          });
          return {
            ...product,
            variants: updatedVariants,
            stock: updatedVariants.reduce((sum, v) => sum + v.stock, 0),
          };
        }

        const qty = matchingItems.reduce((sum, m) => sum + m.quantity, 0);
        const nextStock = Math.max(0, product.stock - qty);
        stockMap[product.id] = nextStock;
        return {
          ...product,
          stock: nextStock,
        };
      });

      try {
        window.localStorage.setItem(LOCAL_STOCK_STORAGE_KEY, JSON.stringify(stockMap));
      } catch {
        // Ignore storage quota errors
      }
      return nextProducts;
    });
  }, []);

  const addToCart = useCallback(
    (product: Product, variant?: ProductVariant, quantity = 1, openDrawer = true) => {
      const activeVariant =
        variant || (product.variants.length > 0 ? product.variants.find((v) => v.available && v.stock > 0) || product.variants[0] : undefined);
      const maxStock = activeVariant ? activeVariant.stock : product.stock;
      if (maxStock <= 0 || (activeVariant && !activeVariant.available)) {
        return;
      }

      const key = activeVariant ? `${product.id}::${activeVariant.id}` : product.id;
      const unitPrice = activeVariant ? activeVariant.price : product.price;
      const sku = activeVariant ? activeVariant.sku : product.sku;
      const image = activeVariant?.imageUrl || product.images[0]?.url || '';

      setCart((prev) => {
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(maxStock, item.quantity + quantity) }
              : item
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            variantId: activeVariant?.id,
            variantLabel: activeVariant?.label,
            sku,
            price: unitPrice,
            quantity: Math.min(maxStock, Math.max(1, quantity)),
            image,
            maxStock,
            customisable: product.customisable,
          },
        ];
      });
      if (openDrawer) {
        setCartOpen(true);
      }
    },
    []
  );

  const updateCartQty = useCallback((key: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.key !== key);
      }
      return prev.map((item) =>
        item.key === key ? { ...item, quantity: Math.min(item.maxStock, quantity) } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        loading,
        error,
        siteConfig,
        categories,
        products,
        reviews,
        refreshStorefront,
        decrementLocalStock,
        cart,
        cartCount,
        cartSubtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
