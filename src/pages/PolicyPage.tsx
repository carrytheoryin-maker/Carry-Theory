import { Link, useParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { usePageSeo } from '../utils/format';

export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { siteConfig } = useStore();

  const policyMap: Record<string, { title: string; body: string }> = {
    shipping: {
      title: 'Shipping Information',
      body:
        siteConfig?.shippingPolicyText ||
        'Orders are dispatched within 24–72 hours. Metro delivery takes 4–6 business days and pan-India delivery takes 5–8 days, with complimentary delivery above ₹599.',
    },
    replacement: {
      title: 'Replacement Policy',
      body:
        siteConfig?.replacementPolicyText ||
        'No replacement for products unless seen explicitly physically damaged, within a return window of 2 days from the date of delivery. No replacement for customised products.',
    },
    privacy: {
      title: 'Privacy Policy',
      body:
        siteConfig?.privacyPolicyText ||
        'Carry Theory respects your privacy and collects customer details solely to fulfil orders and enquiries.',
    },
    terms: {
      title: 'Terms and Conditions',
      body:
        siteConfig?.termsText ||
        'Standard Carry Theory storefront terms and conditions.',
    },
  };

  const active = policyMap[slug || 'shipping'] || policyMap.shipping;

  usePageSeo({
    title: `${active.title} — Carry Theory`,
    description: active.body.slice(0, 155),
    canonicalPath: `/policies/${slug || 'shipping'}`,
  });

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
          Customer Care
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold uppercase tracking-[-0.01em]">
          {active.title}
        </h1>
        <div className="mt-8 border-t border-[#F5F3EF]/12 pt-8 text-sm sm:text-base leading-relaxed text-[#F5F3EF]/78 whitespace-pre-line">
          {active.body}
        </div>
        <div className="mt-12 pt-8 border-t border-[#F5F3EF]/12 flex flex-wrap gap-6 text-xs uppercase tracking-[0.18em] text-[#F5F3EF]/60">
          <Link to="/policies/shipping" className="hover:text-[#C6A77A]">
            Shipping
          </Link>
          <Link to="/policies/replacement" className="hover:text-[#C6A77A]">
            Replacement Policy
          </Link>
          <Link to="/policies/privacy" className="hover:text-[#C6A77A]">
            Privacy
          </Link>
          <Link to="/policies/terms" className="hover:text-[#C6A77A]">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}
