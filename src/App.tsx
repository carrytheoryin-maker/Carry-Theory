/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { CartDrawer } from './components/CartDrawer';
import { CarryTheoryChat } from './components/CarryTheoryChat';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { StoreProvider } from './context/StoreContext';
import { AboutPage } from './pages/AboutPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { PolicyPage } from './pages/PolicyPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';

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
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/collections/:slug" element={<ShopPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/policies/:slug" element={<PolicyPage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </div>
              <Footer />
              <CartDrawer />
              <CarryTheoryChat />
            </div>
          </StoreProvider>
        </BrowserRouter>
      </StoreErrorBoundary>
    </MotionConfig>
  );
}
