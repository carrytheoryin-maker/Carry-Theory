import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/format';
import { SafeImage } from './SafeImage';

export function CartDrawer() {
  const {
    siteConfig,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
  } = useStore();
  const navigate = useNavigate();

  if (!cartOpen) return null;

  const threshold = siteConfig?.freeDeliveryThresholdInr ?? 599;
  const remainingForFreeShipping = Math.max(0, threshold - cartSubtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#0B0B0B] border-l border-[#F5F3EF]/12 text-[#F5F3EF]"
      >
        <div className="flex items-center justify-between border-b border-[#F5F3EF]/10 px-6 py-5">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.22em]">
              Shopping Bag
            </h2>
            <p className="mt-1 text-xs text-[#F5F3EF]/55 tabular-nums">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} selected
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close shopping bag"
            className="flex h-10 w-10 items-center justify-center text-[#F5F3EF]/70 hover:text-[#C6A77A] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shipping Eligibility Note */}
        {cart.length > 0 && (
          <div className="border-b border-[#F5F3EF]/10 bg-[#121212] px-6 py-3 text-xs text-[#F5F3EF]/75">
            {remainingForFreeShipping === 0 ? (
              <span className="text-[#C6A77A]">
                Your order qualifies for complimentary pan-India shipping.
              </span>
            ) : (
              <span>
                Add <span className="tabular-nums text-[#C6A77A]">{formatINR(remainingForFreeShipping)}</span> more for complimentary shipping.
              </span>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <p className="font-editorial text-2xl italic text-[#F5F3EF]/85">
                Your bag is currently empty.
              </p>
              <p className="mt-3 max-w-xs text-sm text-[#F5F3EF]/55">
                Explore tumblers, travel mugs, MagSafe wallets, and digital products built for every form.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="mt-8 bg-[#F5F3EF] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#F5F3EF]/10">
              {cart.map((item) => (
                <li key={item.key} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    to={`/products/${item.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="h-24 w-24 shrink-0 overflow-hidden bg-[#141414] border border-[#F5F3EF]/10"
                  >
                    <SafeImage
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/products/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="block truncate text-sm font-medium text-[#F5F3EF] hover:text-[#C6A77A] transition-colors"
                        >
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <p className="mt-1 text-xs text-[#F5F3EF]/55">{item.variantLabel}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1 text-[#F5F3EF]/45 hover:text-[#F5F3EF] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#F5F3EF]/15">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center text-[#F5F3EF]/75 hover:text-[#C6A77A] transition-colors cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="tabular-nums w-8 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={item.quantity >= item.maxStock}
                          className="flex h-8 w-8 items-center justify-center text-[#F5F3EF]/75 hover:text-[#C6A77A] disabled:opacity-35 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="tabular-nums text-sm font-medium text-[#F5F3EF]">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Actions */}
        {cart.length > 0 && (
          <div className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B] px-6 py-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F5F3EF]/65 uppercase tracking-[0.16em] text-xs">
                Subtotal
              </span>
              <span className="tabular-nums text-lg font-semibold text-[#F5F3EF]">
                {formatINR(cartSubtotal)}
              </span>
            </div>
            <p className="text-xs text-[#F5F3EF]/55">
              Optional customisation and delivery charges calculated at checkout.
            </p>
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="w-full bg-[#F5F3EF] py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors cursor-pointer"
              >
                Proceed to Checkout
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-full border border-[#F5F3EF]/25 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
