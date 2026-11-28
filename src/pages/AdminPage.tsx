import React, { useCallback, useEffect, useState } from 'react';
import { Lock, LogOut, Mail, MessageSquare, Package, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Enquiry, Order, Subscriber } from '../types';
import { formatINR, usePageSeo } from '../utils/format';

interface AdminOverview {
  orders: Order[];
  enquiries: Enquiry[];
  subscribers: Subscriber[];
}

const FULFILMENT_STATUSES: Order['fulfilmentStatus'][] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function AdminPage() {
  usePageSeo({
    title: 'Store Admin — Carry Theory',
    description: 'Restricted administrative console.',
    canonicalPath: '/admin',
    noIndex: true,
  });

  // Session token kept strictly in React memory (never localStorage or sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'enquiries' | 'subscribers'>('orders');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { configured: true }))
      .then((data) => {
        if (!cancelled) {
          setConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchOverview = useCallback(async (authToken: string) => {
    setLoadingData(true);
    setDataError('');
    try {
      const res = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        cache: 'no-store',
      });
      if (res.status === 401) {
        setToken(null);
        setOverview(null);
        setAuthError('Your session expired. Please sign in again.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not load admin records.');
      }
      setOverview({
        orders: Array.isArray(data.orders) ? data.orders : [],
        enquiries: Array.isArray(data.enquiries) ? data.enquiries : [],
        subscribers: Array.isArray(data.subscribers) ? data.subscribers : [],
      });
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to load admin records.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchOverview(token);
    }
  }, [token, fetchOverview]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (trimmed.length < 10 || trimmed.length > 128) {
      setAuthError('Passcode must be between 10 and 128 characters.');
      return;
    }
    if (trimmed !== confirmPasscode.trim()) {
      setAuthError('Passcodes do not match.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to configure admin passcode.');
      }
      setPasscode('');
      setConfirmPasscode('');
      setConfigured(true);
      setToken(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      setAuthError('Please enter your admin passcode.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      setPasscode('');
      setToken(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    fulfilmentStatus: Order['fulfilmentStatus']
  ) => {
    if (!token) return;
    setUpdatingOrderId(orderId);
    setDataError('');
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fulfilmentStatus }),
      });
      if (res.status === 401) {
        setToken(null);
        setOverview(null);
        setAuthError('Your session expired. Please sign in again.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update order status.');
      }
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              orders: prev.orders.map((o) => (o.id === orderId ? data.order : o)),
            }
          : prev
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setOverview(null);
    setPasscode('');
    setConfirmPasscode('');
    setAuthError('');
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-32 pb-24 px-5">
        <div className="mx-auto max-w-md border border-[#F5F3EF]/14 bg-[#111111] p-8 space-y-6">
          <div className="flex items-center gap-3 text-[#C6A77A]">
            <Lock className="h-5 w-5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Restricted Access
            </span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold uppercase tracking-[0.02em]">
              {configured === false ? 'Create Admin Passcode' : 'Store Admin Sign In'}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#F5F3EF]/65">
              {configured === false
                ? 'Set a strong initial administrator passcode (10+ characters) to lock this portal.'
                : 'Enter your administrator passcode to view orders, enquiries, and subscriber records.'}
            </p>
          </div>

          {authError && (
            <p className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
              {authError}
            </p>
          )}

          {configured === null ? (
            <p className="text-xs text-[#F5F3EF]/60">Checking security status...</p>
          ) : configured === false ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <label className="block text-xs">
                <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">
                  New Admin Passcode *
                </span>
                <input
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                />
              </label>

              <label className="block text-xs">
                <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">
                  Confirm Passcode *
                </span>
                <input
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full bg-[#F5F3EF] py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {authBusy ? 'Configuring...' : 'Set Admin Passcode'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-xs">
                <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">
                  Admin Passcode *
                </span>
                <input
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full bg-[#F5F3EF] py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {authBusy ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 space-y-8">
        <div className="border-b border-[#F5F3EF]/12 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#C6A77A]">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-[0.24em]">
                Authenticated Session
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold uppercase tracking-[-0.01em]">
              Carry Theory Admin
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchOverview(token)}
              disabled={loadingData}
              className="inline-flex items-center gap-2 border border-[#F5F3EF]/20 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border border-[#C6A77A]/50 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[#C6A77A] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {dataError && (
          <p className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
            {dataError}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-b border-[#F5F3EF]/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.16em] border transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#C6A77A] bg-[#C6A77A]/12 text-[#C6A77A]'
                : 'border-[#F5F3EF]/15 text-[#F5F3EF]/70 hover:text-[#F5F3EF]'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Orders ({overview?.orders.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enquiries')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.16em] border transition-colors cursor-pointer ${
              activeTab === 'enquiries'
                ? 'border-[#C6A77A] bg-[#C6A77A]/12 text-[#C6A77A]'
                : 'border-[#F5F3EF]/15 text-[#F5F3EF]/70 hover:text-[#F5F3EF]'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Enquiries ({overview?.enquiries.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscribers')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.16em] border transition-colors cursor-pointer ${
              activeTab === 'subscribers'
                ? 'border-[#C6A77A] bg-[#C6A77A]/12 text-[#C6A77A]'
                : 'border-[#F5F3EF]/15 text-[#F5F3EF]/70 hover:text-[#F5F3EF]'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Subscribers ({overview?.subscribers.length ?? 0})</span>
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-4">
            {!overview || overview.orders.length === 0 ? (
              <div className="border border-[#F5F3EF]/12 bg-[#111111] p-8 text-sm text-[#F5F3EF]/60">
                No orders recorded yet.
              </div>
            ) : (
              overview.orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-[#F5F3EF]/12 bg-[#111111] p-6 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F5F3EF]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A77A]">
                        #{order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#F5F3EF]">
                        {order.customerName} · {order.phone} · {order.email}
                      </p>
                      <p className="mt-0.5 text-xs text-[#F5F3EF]/60">
                        {order.address}, {order.city}, {order.state} — {order.pinCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-base font-semibold text-[#C6A77A] tabular-nums">
                          {formatINR(order.total)}
                        </p>
                        <p className="text-[11px] uppercase tracking-wider text-[#F5F3EF]/55">
                          {order.paymentMode === 'upi' ? 'UPI' : 'COD'}
                        </p>
                      </div>

                      <select
                        aria-label={`Fulfilment status for order ${order.orderNumber}`}
                        disabled={updatingOrderId === order.id}
                        value={order.fulfilmentStatus}
                        onChange={(e) =>
                          handleUpdateOrderStatus(
                            order.id,
                            e.target.value as Order['fulfilmentStatus']
                          )
                        }
                        className="bg-[#0B0B0B] border border-[#F5F3EF]/20 px-3 py-2 text-xs uppercase tracking-wider text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                      >
                        {FULFILMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-[#F5F3EF]/75 space-y-1">
                    {order.items.map((item, idx) => (
                      <p key={`${order.id}-${idx}`}>
                        {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''} ×{' '}
                        {item.quantity} — {formatINR(item.price * item.quantity)}
                      </p>
                    ))}
                    {order.customisationRequested && (
                      <p className="text-[#C6A77A]">
                        Customisation requested (+{formatINR(order.customisationFee)})
                      </p>
                    )}
                    {order.upiTransactionRef && (
                      <p className="text-[#F5F3EF]/65">UPI Ref: {order.upiTransactionRef}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'enquiries' && (
          <div className="space-y-4">
            {!overview || overview.enquiries.length === 0 ? (
              <div className="border border-[#F5F3EF]/12 bg-[#111111] p-8 text-sm text-[#F5F3EF]/60">
                No enquiries recorded yet.
              </div>
            ) : (
              overview.enquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="border border-[#F5F3EF]/12 bg-[#111111] p-6 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A77A]">
                      {enq.type} — {enq.productInterest || 'General'}
                    </span>
                    <span className="text-xs text-[#F5F3EF]/50">
                      {new Date(enq.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#F5F3EF]">
                    {enq.fullName} · {enq.email} · {enq.phone}
                  </p>
                  {enq.customisationRequirements && (
                    <p className="text-xs text-[#F5F3EF]/80 whitespace-pre-wrap">
                      Customisation: {enq.customisationRequirements}
                    </p>
                  )}
                  {enq.message && (
                    <p className="text-xs text-[#F5F3EF]/70 whitespace-pre-wrap">{enq.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="border border-[#F5F3EF]/12 bg-[#111111] divide-y divide-[#F5F3EF]/10">
            {!overview || overview.subscribers.length === 0 ? (
              <div className="p-8 text-sm text-[#F5F3EF]/60">No subscribers recorded yet.</div>
            ) : (
              overview.subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-[#F5F3EF]">{sub.email}</span>
                  <span className="text-xs text-[#F5F3EF]/50">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
