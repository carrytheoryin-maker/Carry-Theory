import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { FlashlightHero } from '../components/FlashlightHero';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { usePageSeo } from '../utils/format';
import { syncSubscriberToGoogleSheet } from '../utils/googleSheetsWebhook';

const PILLAR_ICONS = {
  shield: ShieldCheck,
  compass: Compass,
  layers: Layers,
  sparkles: Sparkles,
};

export function HomePage() {
  const { siteConfig, categories, products, reviews, loading } = useStore();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'idle' | 'submitting' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  usePageSeo({
    title: 'Carry Theory — For Every Form | Luxury Everyday Essentials',
    description:
      'Discover Carry Theory’s thoughtfully designed everyday essentials—tumblers, travel mugs, ceramic mugs, MagSafe wallets, and digital products.',
    canonicalPath: '/',
  });

  useEffect(() => {
    if (location.hash === '#categories') {
      const el = document.getElementById('categories');
      if (el) {
        window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 80);
      }
    }
  }, [location.hash]);

  if (loading || !siteConfig) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-5 w-5 border border-[#C6A77A] rotate-45 animate-pulse" />
          <p className="text-xs uppercase tracking-[0.26em] text-[#F5F3EF]/60">
            Carry Theory
          </p>
        </div>
      </div>
    );
  }

  const featuredProducts = products.filter((p) => p.featured).slice(0, 8);
  const displayProducts =
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8);

  const scrollCarousel = (direction: 'prev' | 'next') => {
    const el = carouselRef.current;
    if (!el) return;
    const distance = Math.max(320, el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'next' ? distance : -distance,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newsletterEmail.trim();
    if (!trimmedEmail) return;
    setNewsletterStatus({ type: 'submitting', message: '' });
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });
      } catch {
        res = null;
      }

      const contentType = res?.headers.get('content-type') || '';
      if (!res || res.status === 404 || res.status === 405 || !contentType.includes('application/json')) {
        await syncSubscriberToGoogleSheet(trimmedEmail);
        try {
          const existing = JSON.parse(window.localStorage.getItem('carry_theory_subscribers_v1') || '[]');
          const next = Array.isArray(existing)
            ? Array.from(new Set([...existing, trimmedEmail.toLowerCase()]))
            : [trimmedEmail.toLowerCase()];
          window.localStorage.setItem('carry_theory_subscribers_v1', JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        setNewsletterStatus({
          type: 'success',
          message: 'Thank you for joining Carry Theory.',
        });
        setNewsletterEmail('');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not subscribe at this moment.');
      }
      await syncSubscriberToGoogleSheet(trimmedEmail);
      setNewsletterStatus({
        type: 'success',
        message: data.message || 'Thank you for joining Carry Theory.',
      });
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save subscription.',
      });
    }
  };

  return (
    <main className="bg-[#0B0B0B] text-[#F5F3EF]">
      {/* 1. Signature Interactive Flashlight Hero */}
      <FlashlightHero siteConfig={siteConfig} />

      {/* 2. Shop By Category (Explore the Collection) */}
      <section
        id="categories"
        className="border-t border-[#F5F3EF]/10 bg-[#0E0E0E] py-12 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
                Curated Forms
              </p>
              <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase tracking-[-0.015em]">
                EXPLORE THE COLLECTION.
              </h2>
              <p className="mt-2 sm:mt-3 text-xs sm:text-base text-[#F5F3EF]/65">
                Essentials for every form of everyday living.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#C6A77A] hover:text-[#F5F3EF] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View All Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-5 lg:gap-6">
            {categories.map((cat, idx) => {
              // Symmetrical 2x2 editorial grid for 4 categories, adaptable if more are added
              const spanClass =
                categories.length <= 4
                  ? 'lg:col-span-6 aspect-[4/3] sm:aspect-[16/10]'
                  : idx < 2
                    ? 'lg:col-span-6 aspect-[4/3] sm:aspect-[16/10]'
                    : idx < 5
                      ? 'lg:col-span-4 aspect-[4/3]'
                      : 'lg:col-span-6 aspect-[16/9]';
              return (
                <Link
                  key={cat.id}
                  to={`/collections/${cat.slug}`}
                  className={`group block w-full relative overflow-hidden bg-[#151515] border border-[#F5F3EF]/10 hover:border-[#C6A77A]/50 transition-colors duration-300 ${spanClass}`}
                >
                  <SafeImage
                    src={cat.image}
                    alt={cat.name}
                    style={cat.imagePosition ? { objectPosition: cat.imagePosition } : undefined}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/92 via-[#0B0B0B]/35 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-6 lg:p-7 flex items-end justify-between gap-2 sm:gap-4">
                    <div>
                      <span className="tabular-nums text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#C6A77A]">
                        0{idx + 1}
                      </span>
                      <h3 className="mt-0.5 sm:mt-1 font-display text-sm sm:text-xl lg:text-2xl font-semibold text-[#F5F3EF]">
                        {cat.name}
                      </h3>
                      <span className="mt-1 sm:mt-2 inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#F5F3EF]/75 group-hover:text-[#C6A77A] transition-colors">
                        <span>Explore</span>
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Brand Positioning Section (Philosophy) */}
      <section
        id="brand-positioning"
        className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B] py-7 sm:py-10 lg:py-12"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <motion.div
            initial={false}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-2 lg:gap-8"
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#C6A77A]">
                Philosophy
              </p>
              <h2 className="mt-1 font-display text-lg sm:text-2xl font-semibold uppercase tracking-[-0.015em] text-[#F5F3EF]">
                {siteConfig.positioningHeading}
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed text-[#F5F3EF]/65 max-w-xl">
              {siteConfig.positioningSubheading}
            </p>
          </motion.div>

          <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 border-t border-l border-[#F5F3EF]/12">
            {siteConfig.positioningPillars.map((pillar) => {
              const IconComponent = PILLAR_ICONS[pillar.iconName] || ShieldCheck;
              return (
                <div
                  key={pillar.number}
                  className="group p-3 sm:p-4 lg:p-5 border-r border-b border-[#F5F3EF]/12 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="tabular-nums text-[9px] sm:text-[10px] font-medium tracking-[0.12em] sm:tracking-[0.18em] text-[#C6A77A] leading-tight">
                      {pillar.number} — {pillar.label}
                    </span>
                    <IconComponent
                      className="h-3.5 w-3.5 text-[#C6A77A]/75 group-hover:text-[#C6A77A] transition-colors shrink-0"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="mt-2 font-display text-xs sm:text-sm font-semibold text-[#F5F3EF] group-hover:text-[#C6A77A] transition-colors leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-[11px] sm:text-xs leading-snug sm:leading-relaxed text-[#F5F3EF]/62">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Featured Products Section */}
      <section className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B] py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
                Signature Releases
              </p>
              <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase tracking-[-0.015em]">
                THE CARRY THEORY EDIT.
              </h2>
              <p className="mt-2 sm:mt-3 text-xs sm:text-base text-[#F5F3EF]/65">
                Discover the essentials that define our collection.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 border border-[#F5F3EF]/25 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <span>Shop All Essentials</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Customer Reviews & Testimonials */}
      <section className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B] py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
                Client Impressions
              </p>
              <h2 className="mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase tracking-[-0.015em]">
                THE EXPERIENCE, IN THEIR WORDS.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#F5F3EF]/65">
                Real experiences. Thoughtful essentials. Lasting impressions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollCarousel('prev')}
                aria-label="Previous reviews"
                className="flex h-11 w-11 items-center justify-center border border-[#F5F3EF]/20 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel('next')}
                aria-label="Next reviews"
                className="flex h-11 w-11 items-center justify-center border border-[#F5F3EF]/20 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-10 border border-[#F5F3EF]/10 bg-[#121212] p-8 text-sm text-[#F5F3EF]/60">
              Customer reviews will appear here soon.
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="mt-10 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="snap-start shrink-0 w-[86vw] sm:w-[400px] lg:w-[420px] flex flex-col justify-between bg-[#101010] border border-[#F5F3EF]/12 p-7"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? 'fill-[#C6A77A] text-[#C6A77A]'
                                : 'text-[#F5F3EF]/20'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#C6A77A]/80">
                        {review.isSamplePreview
                          ? 'Sample Preview'
                          : review.verifiedPurchase
                            ? 'Verified Purchase'
                            : 'Client Review'}
                      </span>
                    </div>

                    <p className="mt-5 font-editorial text-xl sm:text-[22px] leading-relaxed text-[#F5F3EF]/90">
                      “{review.text}”
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#F5F3EF]/10 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#F5F3EF]">{review.customerName}</span>
                    {review.productName && (
                      <span className="text-[#F5F3EF]/50 truncate max-w-[190px]">
                        {review.productName}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Lifestyle / Brand Story Editorial Section */}
      <section className="relative border-t border-[#F5F3EF]/10 overflow-hidden bg-[#0B0B0B]">
        <div className="relative min-h-[520px] lg:min-h-[620px] flex items-center">
          <div className="absolute inset-0">
            <SafeImage
              src={siteConfig.storyImage}
              alt="Carry Theory lifestyle workspace scene"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B]/95 via-[#0B0B0B]/70 to-[#0B0B0B]/30" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
            <motion.div
              initial={false}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
                Brand Story
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-semibold uppercase tracking-[-0.015em] leading-[1.08] text-[#F5F3EF]">
                <span className="block">{siteConfig.storyHeadingLine1}</span>
                <span className="block mt-1">{siteConfig.storyHeadingLine2}</span>
              </h2>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#F5F3EF]/78">
                {siteConfig.storyCopy}
              </p>
              <Link
                to="/about"
                className="mt-8 inline-flex items-center gap-2.5 border border-[#F5F3EF]/60 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors"
              >
                <span>DISCOVER OUR STORY</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8. Minimalist Newsletter / Community Section */}
      <section className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B] py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-5 sm:px-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
            The Carry Theory Journal
          </p>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-semibold uppercase tracking-[0.04em]">
            STAY IN THE KNOW.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#F5F3EF]/65">
            Discover new arrivals, exclusive collections, and the latest from Carry Theory.
          </p>

          <form
            onSubmit={handleSubscribe}
            className="mt-8 flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 bg-[#121212] border border-[#F5F3EF]/20 px-4 py-3.5 text-base sm:text-sm text-[#F5F3EF] placeholder:text-[#F5F3EF]/40 focus:border-[#C6A77A] focus:outline-none"
            />
            <button
              type="submit"
              disabled={newsletterStatus.type === 'submitting'}
              className="bg-[#F5F3EF] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {newsletterStatus.type === 'submitting' ? 'Saving...' : 'Subscribe'}
            </button>
          </form>

          {newsletterStatus.type !== 'idle' && newsletterStatus.message && (
            <p
              className={`mt-4 text-xs ${
                newsletterStatus.type === 'error' ? 'text-red-300' : 'text-[#C6A77A]'
              }`}
            >
              {newsletterStatus.message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
