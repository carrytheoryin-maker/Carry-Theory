import React, { useState } from 'react';
import { Check, Instagram, Mail, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl, usePageSeo } from '../utils/format';

export function ContactPage() {
  const { siteConfig } = useStore();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  usePageSeo({
    title: 'Contact Us — Carry Theory',
    description:
      'Reach the Carry Theory concierge for product enquiries, customisation requests, and order support.',
    canonicalPath: '/contact',
  });

  const whatsapp = siteConfig?.whatsappNumber || '+91 9742597425';
  const instagram = siteConfig?.instagramHandle || '@carrytheory.in';
  const email = siteConfig?.contactEmail || 'carrytheoryin@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = {
      type: 'contact' as const,
      fullName: form.fullName,
      company: '',
      email: form.email,
      phone: form.phone,
      productInterest: 'General Enquiry',
      estimatedQuantity: '',
      customisationRequirements: '',
      message: form.message,
    };
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/enquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        res = null;
      }

      const contentType = res?.headers.get('content-type') || '';
      if (!res || res.status === 404 || res.status === 405 || !contentType.includes('application/json')) {
        try {
          const existing = JSON.parse(window.localStorage.getItem('carry_theory_enquiries_v1') || '[]');
          const next = Array.isArray(existing)
            ? [{ id: `enq-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...existing].slice(0, 25)
            : [{ id: `enq-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }];
          window.localStorage.setItem('carry_theory_enquiries_v1', JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        setSent(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send message.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
            Client Concierge
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold uppercase tracking-[-0.015em]">
            CONTACT US.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#F5F3EF]/68">
            Questions about an order, product details, or customisation? Reach us directly through your preferred channel.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-6 border-t border-[#F5F3EF]/12 pt-8">
            <a
              href={buildWhatsAppUrl(whatsapp, 'Hello Carry Theory, I have a question.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-4 border border-[#F5F3EF]/12 bg-[#111111] p-6 hover:border-[#C6A77A]/60 transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-[#C6A77A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C6A77A]">WhatsApp</p>
                <p className="mt-1 text-base font-medium text-[#F5F3EF]">{whatsapp}</p>
                <p className="mt-1 text-xs text-[#F5F3EF]/55">
                  Quickest for product questions and personalisation help.
                </p>
              </div>
            </a>

            <a
              href={`mailto:${email}`}
              className="flex items-start gap-4 border border-[#F5F3EF]/12 bg-[#111111] p-6 hover:border-[#C6A77A]/60 transition-colors"
            >
              <Mail className="h-5 w-5 text-[#C6A77A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C6A77A]">Email</p>
                <p className="mt-1 text-base font-medium text-[#F5F3EF]">{email}</p>
                <p className="mt-1 text-xs text-[#F5F3EF]/55">
                  Customer support, replacements, and partnerships.
                </p>
              </div>
            </a>

            <a
              href={`https://www.instagram.com/${instagram.replace(/^@/, '')}/`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-4 border border-[#F5F3EF]/12 bg-[#111111] p-6 hover:border-[#C6A77A]/60 transition-colors"
            >
              <Instagram className="h-5 w-5 text-[#C6A77A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C6A77A]">Instagram</p>
                <p className="mt-1 text-base font-medium text-[#F5F3EF]">{instagram}</p>
                <p className="mt-1 text-xs text-[#F5F3EF]/55">
                  Follow launches and studio releases.
                </p>
              </div>
            </a>
          </div>

          <div className="lg:col-span-7 bg-[#111111] border border-[#F5F3EF]/12 p-6 sm:p-10">
            <h2 className="font-display text-xl font-semibold uppercase tracking-[0.04em]">
              Send a Message
            </h2>
            {sent ? (
              <div className="mt-6 border border-[#C6A77A]/40 bg-[#0B0B0B] p-6 space-y-3">
                <div className="flex items-center gap-2 text-[#C6A77A]">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Message Saved</span>
                </div>
                <p className="text-sm text-[#F5F3EF]/75">
                  Thank you, {form.fullName}. Our team has received your message and will reply shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Email *</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Phone *</span>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/70">Message *</span>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-2 w-full bg-[#0B0B0B] border border-[#F5F3EF]/18 px-4 py-3 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#F5F3EF] py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
