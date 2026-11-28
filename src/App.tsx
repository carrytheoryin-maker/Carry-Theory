/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { StoreProvider } from './context/StoreContext';
import { HomePage } from './pages/HomePage';

const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const PolicyPage = lazy(() => import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function PageLoader() {
  return (
    <div className="min-h-[60vh] bg-[#0B0B0B] flex items-center justify-center">
      <div className="h-5 w-5 border border-[#C6A77A] rotate-45 animate-pulse" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

class StoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] flex items-center justify-center px-6 text-center">
          <div className="max-w-md space-y-4 border border-[#C6A77A]/30 bg-[#121212] p-8">
            <p className="text-xs uppercase tracking-[0.26em] text-[#C6A77A]">Carry Theory</p>
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-[#F5F3EF]/70">
              Please refresh the page to reload the Carry Theory storefront.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-[#F5F3EF] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B]"
            >
              Reload Page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreErrorBoundary>
        <BrowserRouter>
          <StoreProvider>
            <ScrollToTop />
            <div className="flex min-h-screen flex-col bg-[#0B0B0B] text-[#F5F3EF] overflow-x-clip">
              <Navbar />
              <div className="flex-1">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/collections/:slug" element={<ShopPage />} />
                    <Route path="/products/:slug" element={<ProductDetailPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/policies/:slug" element={<PolicyPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </Suspense>
              </div>
              <Footer />
              <CartDrawer />
            </div>
          </StoreProvider>
        </BrowserRouter>
      </StoreErrorBoundary>
    </MotionConfig>
  );
}
