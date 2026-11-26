import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  CartItem,
  Category,
  Product,
  ProductVariant,
  Review,
  SiteConfig,
  StorefrontBootstrap,
} from '../types';

interface StoreContextValue {
  loading: boolean;
  error: string | null;
  siteConfig: SiteConfig | null;
  categories: Category[];
  products: Product[];
  reviews: Review[];
  refreshStorefront: () => Promise<void>;
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [cart, setCart] = useState<CartItem[]>(loadPersistedCart);
  const [cartOpen, setCartOpen] = useState(false);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Unable to load Carry Theory storefront');
      const data = (await res.json()) as StorefrontBootstrap;
      setSiteConfig(data.siteConfig);
      setCategories(data.categories);
      setProducts(data.products);
      setReviews(data.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load storefront');
    } finally {
      setLoading(false);
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
