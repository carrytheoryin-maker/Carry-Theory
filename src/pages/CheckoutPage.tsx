import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Check, Copy, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { formatINR, usePageSeo } from '../utils/format';

export function CheckoutPage() {
  const {
    siteConfig,
    products,
    cart,
    cartSubtotal,
    clearCart,
    refreshStorefront,
  } = useStore();

  const [form, setForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
  });
  const [wantsCustomisation, setWantsCustomisation] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cod' | 'upi'>('cod');
  const [upiTransactionRef, setUpiTransactionRef] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  usePageSeo({
    title: 'Checkout — Carry Theory',
    description: 'Complete your Carry Theory order with optional customisation, Cash on Delivery, or UPI Payment.',
    canonicalPath: '/checkout',
  });

  const hasCustomisableItem = useMemo(() => {
    return cart.some((item) => {
      if (typeof item.customisable === 'boolean') return item.customisable;
      const liveProduct = products.find((p) => p.id === item.productId);
      return Boolean(liveProduct?.customisable);
    });
  }, [cart, products]);

  const fee = siteConfig?.deliveryFeeInr ?? 99;
  const threshold = siteConfig?.freeDeliveryThresholdInr ?? 599;
  const customFeeRate = siteConfig?.customisationFeeInr ?? 50;
  const customisationCharges = hasCustomisableItem && wantsCustomisation ? customFeeRate : 0;
  const deliveryCharges = cartSubtotal === 0 || cartSubtotal >= threshold ? 0 : fee;
  const finalTotal = cartSubtotal + customisationCharges + deliveryCharges;

  const accountHolderName = siteConfig?.upiDetails?.accountHolderName || 'Sayam Nahta';
  const upiPhoneNumber = siteConfig?.upiDetails?.phoneNumber || '7300004000';

  const handleCopyUpiNumber = async () => {
    try {
      await navigator.clipboard.writeText(upiPhoneNumber);
      setCopiedNumber(true);
      window.setTimeout(() => setCopiedNumber(false), 2500);
    } catch {
      // Clipboard API unavailable; ignore gracefully
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customisationRequested: hasCustomisableItem && wantsCustomisation,
          paymentMode,
          upiTransactionRef: paymentMode === 'upi' ? upiTransactionRef.trim() : '',
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not process order.');
      }

      clearCart();
      await refreshStorefront();
      setConfirmedOrder(data.order as Order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-32 pb-24 px-5 sm:px-8">
        <div className="mx-auto max-w-2xl border border-[#C6A77A]/40 bg-[#111111] p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 text-[#C6A77A]">
            <Check className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">
              Order Confirmed — Preparing Shipment
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold">
            Order #{confirmedOrder.orderNumber}
          </h1>

          <div className="border border-[#C6A77A]/35 bg-[#0B0B0B] p-4 text-xs leading-relaxed text-[#F5F3EF]/85 space-y-1.5">
            <p>
              <strong className="text-[#C6A77A]">Payment Method:</strong>{' '}
              {confirmedOrder.paymentMode === 'cod'
                ? 'Cash on Delivery (Pay upon delivery)'
                : 'UPI Payment'}
            </p>
            {confirmedOrder.paymentMode === 'upi' && (
              <>
                <p className="text-[#F5F3EF]/75">
                  UPI Transfer To: <strong className="text-[#F5F3EF]">{accountHolderName}</strong> ·{' '}
                  <span className="tabular-nums text-[#C6A77A]">{upiPhoneNumber}</span>
                </p>
                {confirmedOrder.upiTransactionRef ? (
                  <p className="text-[#F5F3EF]/75">
                    Submitted Reference / UTR:{' '}
                    <span className="tabular-nums text-[#F5F3EF]">{confirmedOrder.upiTransactionRef}</span>
                  </p>
                ) : (
                  <p className="text-[#F5F3EF]/65">
                    Please complete the UPI transfer of {formatINR(confirmedOrder.total)} to {upiPhoneNumber} ({accountHolderName}) and share confirmation if requested.
                  </p>
                )}
              </>
            )}
            {confirmedOrder.customisationRequested && (
              <p className="text-[#F5F3EF]/80 pt-1">
                <strong className="text-[#C6A77A]">Customisation:</strong> Added (+{formatINR(confirmedOrder.customisationFee)}). Our team will contact you shortly regarding your customisation.
              </p>
            )}
          </div>

          <div className="border-t border-[#F5F3EF]/12 pt-5 space-y-3 text-sm">
            {confirmedOrder.items.map((item, idx) => (
              <div key={`${item.productId}-${item.variantId || idx}`} className="flex items-center justify-between gap-4">
                <span className="text-[#F5F3EF]/85">
                  {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatINR(item.price * item.quantity)}</span>
              </div>
            ))}
            {confirmedOrder.customisationRequested && (
              <div className="border-t border-[#F5F3EF]/10 pt-3 flex items-center justify-between text-[#F5F3EF]/75">
                <span>Customisation Charges</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.customisationFee)}</span>
              </div>
            )}
            <div className="border-t border-[#F5F3EF]/10 pt-3 flex items-center justify-between text-[#F5F3EF]/65">
              <span>Delivery Charges</span>
              <span className="tabular-nums">
                {confirmedOrder.deliveryCharges === 0 ? 'Complimentary' : formatINR(confirmedOrder.deliveryCharges)}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[#C6A77A]">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(confirmedOrder.total)}</span>
            </div>
          </div>

          <div className="border-t border-[#F5F3EF]/12 pt-5 text-xs text-[#F5F3EF]/65 space-y-1">
            <p className="uppercase tracking-[0.16em] text-[#F5F3EF]/85">Shipping To</p>
            <p>{confirmedOrder.customerName} · {confirmedOrder.phone}</p>
            <p>{confirmedOrder.address}, {confirmedOrder.city}, {confirmedOrder.state} — {confirmedOrder.pinCode}</p>
          </div>

          <Link
            to="/shop"
            className="inline-block bg-[#F5F3EF] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="border-b border-[#F5F3EF]/12 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
              Carry Theory Checkout
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold uppercase tracking-[-0.01em]">
              Complete Your Order
            </h1>
          </div>
          <p className="text-xs text-[#F5F3EF]/60">
            Free delivery above <span className="tabular-nums text-[#C6A77A]">{formatINR(threshold)}</span> (₹{fee} below {formatINR(threshold)}).
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="mt-12 border border-[#F5F3EF]/12 bg-[#111111] p-12 text-center max-w-xl mx-auto">
            <p className="font-editorial text-2xl italic">Your shopping bag is empty.</p>
            <Link
              to="/shop"
              className="mt-6 inline-block bg-[#F5F3EF] px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors"
            >
              Browse Essentials
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Shipping, Customisation & Payment Form */}
            <form onSubmit={handleCheckout} className="lg:col-span-7 bg-[#111111] border border-[#F5F3EF]/12 p-6 sm:p-8 space-y-6">
              <div className="space-y-5">
                <h2 className="font-display text-lg font-semibold uppercase tracking-[0.06em]">
                  Shipping Details (India)
                </h2>

                {error && (
                  <p className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
                    {error}
                  </p>
                )}

                <label className="block text-xs">
                  <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Full Name *</span>
                  <input
                    required
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Email Address *</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Phone Number *</span>
                    <input
                      required
                      type="tel"
                      placeholder="+91 98XXXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block text-xs">
                  <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">
                    Shipping Address *
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">City *</span>
                    <input
                      required
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">State *</span>
                    <input
                      required
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">PIN Code *</span>
                    <input
                      required
                      type="text"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="6 digits"
                      value={form.pinCode}
                      onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] tabular-nums focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Optional Customisation (+₹50 shown only at checkout) */}
              {hasCustomisableItem && (
                <div className="border-t border-[#F5F3EF]/12 pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#C6A77A] shrink-0" />
                      <h2 className="font-display text-lg font-semibold uppercase tracking-[0.06em]">
                        Would You Like Customisation?
                      </h2>
                    </div>
                    <span className="tabular-nums text-xs font-semibold uppercase tracking-[0.14em] text-[#C6A77A]">
                      +{formatINR(customFeeRate)}
                    </span>
                  </div>

                  <p className="text-xs text-[#F5F3EF]/65">
                    Customisation costs an additional{' '}
                    <strong className="text-[#F5F3EF]">{formatINR(customFeeRate)}</strong>. If selected, our team will contact you regarding customisation after your order is placed.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setWantsCustomisation(false)}
                      className={`border p-4 text-left transition-colors cursor-pointer ${
                        !wantsCustomisation
                          ? 'border-[#C6A77A] bg-[#C6A77A]/10'
                          : 'border-[#F5F3EF]/18 bg-[#0B0B0B] hover:border-[#C6A77A]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F5F3EF]">
                          No Customisation
                        </p>
                        <span className="tabular-nums text-xs text-[#F5F3EF]/70">₹0</span>
                      </div>
                      <p className="mt-1 text-xs text-[#F5F3EF]/60">
                        Standard clean Carry Theory finish.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWantsCustomisation(true)}
                      className={`border p-4 text-left transition-colors cursor-pointer ${
                        wantsCustomisation
                          ? 'border-[#C6A77A] bg-[#C6A77A]/10'
                          : 'border-[#F5F3EF]/18 bg-[#0B0B0B] hover:border-[#C6A77A]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C6A77A]">
                          Yes, Add Customisation
                        </p>
                        <span className="tabular-nums text-xs font-semibold text-[#C6A77A]">
                          +{formatINR(customFeeRate)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#F5F3EF]/65">
                        Adds ₹{customFeeRate} to your final bill.
                      </p>
                    </button>
                  </div>

                  {wantsCustomisation && (
                    <div className="border border-[#C6A77A]/40 bg-[#0B0B0B] p-4 text-xs leading-relaxed text-[#F5F3EF]/80">
                      Our team will contact you regarding customisation after order confirmation to finalise your preferences.
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="border-t border-[#F5F3EF]/12 pt-6 space-y-4">
                <h2 className="font-display text-lg font-semibold uppercase tracking-[0.06em]">
                  Payment Method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cod')}
                    className={`flex items-start gap-3.5 border p-4 text-left transition-colors cursor-pointer ${
                      paymentMode === 'cod'
                        ? 'border-[#C6A77A] bg-[#C6A77A]/10'
                        : 'border-[#F5F3EF]/18 bg-[#0B0B0B] hover:border-[#C6A77A]/50'
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-[#C6A77A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F3EF]">
                        Cash on Delivery
                      </p>
                      <p className="mt-1 text-xs text-[#F5F3EF]/60">
                        Pay in cash when your order arrives at your doorstep.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`flex items-start gap-3.5 border p-4 text-left transition-colors cursor-pointer ${
                      paymentMode === 'upi'
                        ? 'border-[#C6A77A] bg-[#C6A77A]/10'
                        : 'border-[#F5F3EF]/18 bg-[#0B0B0B] hover:border-[#C6A77A]/50'
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-[#C6A77A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F3EF]">
                        UPI Payment
                      </p>
                      <p className="mt-1 text-xs text-[#F5F3EF]/60">
                        Transfer via Google Pay, PhonePe, Paytm, or BHIM.
                      </p>
                    </div>
                  </button>
                </div>

                {paymentMode === 'upi' && (
                  <div className="border border-[#C6A77A]/40 bg-[#0B0B0B] p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F5F3EF]/10 pb-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#C6A77A]">
                          Direct UPI Transfer Details
                        </p>
                        <p className="mt-1.5 text-sm text-[#F5F3EF]">
                          Account Holder Name:{' '}
                          <strong className="font-semibold">{accountHolderName}</strong>
                        </p>
                        <p className="mt-1 text-sm text-[#F5F3EF]">
                          UPI Mobile Number:{' '}
                          <strong className="tabular-nums font-semibold text-[#C6A77A]">
                            {upiPhoneNumber}
                          </strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyUpiNumber}
                        className="inline-flex items-center gap-2 border border-[#C6A77A]/50 px-3.5 py-2 text-xs uppercase tracking-[0.16em] text-[#C6A77A] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors self-start sm:self-center cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedNumber ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Number</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs leading-relaxed text-[#F5F3EF]/68">
                      Send <strong className="tabular-nums text-[#F5F3EF]">{formatINR(finalTotal)}</strong> to{' '}
                      <strong className="tabular-nums text-[#F5F3EF]">{upiPhoneNumber}</strong> ({accountHolderName}) using any UPI app, then enter your transaction reference below (optional).
                    </p>

                    <label className="block text-xs">
                      <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">
                        UPI Transaction / UTR Reference (Optional)
                      </span>
                      <input
                        type="text"
                        maxLength={60}
                        placeholder="e.g., 432819XXXXXX"
                        value={upiTransactionRef}
                        onChange={(e) => setUpiTransactionRef(e.target.value)}
                        className="mt-2 w-full bg-[#121212] border border-[#F5F3EF]/18 px-4 py-2.5 text-sm text-[#F5F3EF] tabular-nums focus:border-[#C6A77A] focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#F5F3EF] py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Confirming Order...'
                    : paymentMode === 'cod'
                      ? `Confirm Cash on Delivery Order (${formatINR(finalTotal)})`
                      : `Place Order via UPI (${formatINR(finalTotal)})`}
                </button>
              </div>
            </form>

            {/* Order Summary */}
            <aside className="lg:col-span-5 bg-[#111111] border border-[#F5F3EF]/12 p-6 sm:p-8 space-y-6">
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.06em]">
                Order Summary
              </h2>

              <ul className="divide-y divide-[#F5F3EF]/10">
                {cart.map((item) => (
                  <li key={item.key} className="flex items-center gap-4 py-4 first:pt-0">
                    <div className="h-16 w-16 shrink-0 bg-[#151515] border border-[#F5F3EF]/10 overflow-hidden">
                      <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F3EF] truncate">{item.name}</p>
                      <p className="text-xs text-[#F5F3EF]/55">
                        {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <span className="tabular-nums text-sm font-medium">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-[#F5F3EF]/12 pt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-[#F5F3EF]/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatINR(cartSubtotal)}</span>
                </div>
                {hasCustomisableItem && (
                  <div className="flex items-center justify-between text-[#F5F3EF]/75">
                    <span>Customisation</span>
                    <span className="tabular-nums text-[#C6A77A]">
                      {customisationCharges > 0 ? `+${formatINR(customisationCharges)}` : 'Not selected (₹0)'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#F5F3EF]/70">
                  <span>Delivery Charges</span>
                  <span className="tabular-nums">
                    {deliveryCharges === 0 ? 'Complimentary' : formatINR(deliveryCharges)}
                  </span>
                </div>
                <div className="border-t border-[#F5F3EF]/12 pt-3 flex items-center justify-between text-base font-semibold">
                  <span>Final Total</span>
                  <span className="tabular-nums text-[#C6A77A]">{formatINR(finalTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-[#F5F3EF]/55 pt-2">
                <ShieldCheck className="h-4 w-4 text-[#C6A77A] shrink-0" />
                <span>Totals and stock availability are verified on order placement.</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
