import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../utils/format';
import { syncEnquiryToGoogleSheet } from '../utils/googleSheetsWebhook';

interface QuickEnquiryModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
}

export function QuickEnquiryModal({ open, onClose, productName }: QuickEnquiryModalProps) {
  const { siteConfig } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customisationRequirements, setCustomisationRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const whatsapp = siteConfig?.whatsappNumber || '+91 9742597425';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = {
      type: 'customisation' as const,
      fullName,
      email,
      phone,
      productInterest: productName,
      customisationRequirements,
      message: `Customisation enquiry for ${productName}`,
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
        await syncEnquiryToGoogleSheet(payload);
        try {
          const existing = JSON.parse(window.localStorage.getItem('carry_theory_enquiries_v1') || '[]');
          const next = Array.isArray(existing)
            ? [{ id: `enq-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...existing].slice(0, 25)
            : [{ id: `enq-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }];
          window.localStorage.setItem('carry_theory_enquiries_v1', JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        setSubmitted(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit enquiry.');
      await syncEnquiryToGoogleSheet(payload);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customisation Enquiry"
        className="relative z-10 w-full max-w-lg bg-[#0B0B0B] border border-[#C6A77A]/35 p-6 sm:p-8 text-[#F5F3EF] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F5F3EF]/10 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C6A77A]">
              Customisable Product
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[#F5F3EF]/60 hover:text-[#C6A77A] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#F5F3EF]/70">
          Select the customisation option during checkout and our team will contact you regarding your customisation, or reach out below with any questions.
        </p>

        <div className="mt-4">
          <a
            href={buildWhatsAppUrl(
              whatsapp,
              `Hello Carry Theory, I have a question about customising ${productName}.`
            )}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2.5 border border-[#C6A77A]/60 bg-[#141414] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A77A] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat on WhatsApp ({whatsapp})</span>
          </a>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#F5F3EF]/40">
          <span className="h-px flex-1 bg-[#F5F3EF]/10" />
          <span>Or Send Question</span>
          <span className="h-px flex-1 bg-[#F5F3EF]/10" />
        </div>

        {submitted ? (
          <div className="border border-[#C6A77A]/40 bg-[#121212] p-5 text-sm space-y-2">
            <p className="font-semibold text-[#C6A77A]">Enquiry Saved</p>
            <p className="text-[#F5F3EF]/80">
              Thank you, {fullName}. Our team will contact you shortly regarding customisation for {productName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}
            <label className="block text-xs">
              <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/65">Full Name *</span>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full bg-[#121212] border border-[#F5F3EF]/15 px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs">
                <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/65">Email Address *</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full bg-[#121212] border border-[#F5F3EF]/15 px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                />
              </label>
              <label className="block text-xs">
                <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/65">Phone / WhatsApp *</span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full bg-[#121212] border border-[#F5F3EF]/15 px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="uppercase tracking-[0.16em] text-[#F5F3EF]/65">Your Question</span>
              <textarea
                rows={3}
                placeholder="Any questions about customising this product..."
                value={customisationRequirements}
                onChange={(e) => setCustomisationRequirements(e.target.value)}
                className="mt-1.5 w-full bg-[#121212] border border-[#F5F3EF]/15 px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#F5F3EF] py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
