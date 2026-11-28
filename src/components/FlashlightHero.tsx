import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { SiteConfig } from '../types';
import { toWebpAssetUrl } from '../utils/format';

interface FlashlightHeroProps {
  siteConfig: SiteConfig;
}

export function FlashlightHero({ siteConfig }: FlashlightHeroProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay) return;

    const isMobileViewport = () => window.innerWidth < 768;

    const applySpotlight = (xPx: number, yPx: number, radiusPx: number) => {
      overlay.style.background = `radial-gradient(circle ${radiusPx}px at ${xPx.toFixed(1)}px ${yPx.toFixed(1)}px, rgba(11,11,11,0) 0%, rgba(11,11,11,0.14) 34%, rgba(11,11,11,0.66) 66%, rgba(11,11,11,0.88) 100%)`;
    };

    const getRadius = () => {
      const w = container.clientWidth || 1200;
      return Math.min(250, Math.max(195, Math.round(w * 0.175)));
    };

    if (prefersReducedMotion || isMobileViewport()) {
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 720;
      applySpotlight(w * 0.56, h * 0.48, getRadius());
      return;
    }

    let targetX = (container.clientWidth || 1200) * 0.56;
    let targetY = (container.clientHeight || 720) * 0.48;
    let currentX = (container.clientWidth || 1200) * 0.38;
    let currentY = (container.clientHeight || 720) * 0.52;
    let userInteracted = false;
    let frameId = 0;

    const startTime = performance.now();

    const tick = (now: number) => {
      if (isMobileViewport()) {
        frameId = 0;
        return;
      }

      const elapsed = now - startTime;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 720;

      if (!userInteracted && elapsed < 1800) {
        const progress = Math.min(1, elapsed / 1800);
        const eased = 1 - Math.pow(1 - progress, 3);
        targetX = w * (0.36 + 0.22 * eased);
        targetY = h * (0.54 - 0.06 * eased);
      }

      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      applySpotlight(currentX, currentY, getRadius());
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    const updateFromClientCoords = (clientX: number, clientY: number) => {
      if (isMobileViewport()) return;
      const rect = container.getBoundingClientRect();
      userInteracted = true;
      targetX = clientX - rect.left;
      targetY = clientY - rect.top;
    };

    const onMouseMove = (e: MouseEvent) => {
      updateFromClientCoords(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      updateFromClientCoords(e.clientX, e.clientY);
    };

    const onResize = () => {
      applySpotlight(currentX, currentY, getRadius());
    };

    container.addEventListener('mousemove', onMouseMove, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
    };
  }, [prefersReducedMotion]);

  const heroSrc =
    siteConfig.heroImageUrl ||
    '/assets/aistudio/Warm_Studio_Still_Life_with_Tumblers_and_Mugs_2d1e9d8f.png';
  const heroWebpSrc = toWebpAssetUrl(heroSrc);

  return (
    <section
      ref={containerRef}
      aria-label="Carry Theory Showcase"
      className="hero-desktop-height relative w-full overflow-hidden bg-[#0B0B0B] pt-[108px] md:pt-0 md:flex md:items-end"
    >
      {/* Mobile Showcase Image: Full Uncropped Product View with No Flashlight */}
      <div className="md:hidden relative w-full bg-[#0B0B0B]">
        <picture className="contents">
          {heroWebpSrc && <source srcSet={heroWebpSrc} type="image/webp" />}
          <img
            src={heroSrc}
            alt="Carry Theory curated essentials showcase"
            width={1920}
            height={1080}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="block w-full h-auto object-contain object-center"
          />
        </picture>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0B0B0B] to-transparent"
        />
      </div>

      {/* Desktop Hero Base Image (Universal radial-gradient overlay — fully compatible with Mac & iPad Safari) */}
      <div className="hidden md:block absolute inset-0 z-0 pointer-events-none select-none">
        <picture className="contents">
          {heroWebpSrc && <source srcSet={heroWebpSrc} type="image/webp" />}
          <img
            src={heroSrc}
            alt="Carry Theory curated essentials showcase"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover object-center brightness-[1.08] contrast-[1.04]"
          />
        </picture>
      </div>

      {/* Desktop Interactive Flashlight Vignette Overlay */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="hidden md:block absolute inset-0 z-[2] pointer-events-none select-none"
        style={{
          background:
            'radial-gradient(circle 225px at 56% 48%, rgba(11,11,11,0) 0%, rgba(11,11,11,0.14) 34%, rgba(11,11,11,0.66) 66%, rgba(11,11,11,0.88) 100%)',
        }}
      />

      {/* Desktop Protective Contrast Scrim Behind Headline Text */}
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-0 z-[5] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 68% 58% at 18% 88%, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.72) 45%, rgba(11,11,11,0.18) 80%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-x-0 bottom-0 z-[5] h-[42%] pointer-events-none bg-gradient-to-t from-[#0B0B0B]/92 via-[#0B0B0B]/45 to-transparent"
      />

      {/* Hero Typography & Actions (Below Image on Mobile, Lower-Left Overlay on Desktop) */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pt-4 pb-6 md:px-8 md:pt-28 md:pb-14 lg:px-12 lg:pb-16">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A] mb-1.5 sm:mb-3">
            {siteConfig.brandName}
          </p>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-[2.85rem] font-semibold uppercase tracking-[-0.02em] leading-[1.08] text-[#F5F3EF]">
            <span className="block">{siteConfig.heroHeadingLine1}</span>
            <span className="block mt-0.5 sm:mt-1 text-[#F5F3EF]">{siteConfig.heroHeadingLine2}</span>
          </h1>

          <p className="mt-2.5 sm:mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-[#F5F3EF]/85">
            {siteConfig.heroSubheading}
          </p>

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center bg-[#F5F3EF] px-4 py-2.5 sm:px-6 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors duration-200 whitespace-nowrap shrink-0 shadow-lg"
            >
              {siteConfig.heroPrimaryCta}
            </Link>

            <Link
              to="/about"
              className="inline-flex items-center justify-center border border-[#F5F3EF]/70 bg-[#0B0B0B]/70 px-4 py-2.5 sm:px-6 sm:py-3 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              {siteConfig.heroSecondaryCta}
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Desktop Scroll Indicator */}
      <a
        href="#brand-positioning"
        aria-label="Scroll to brand positioning"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.26em] text-[#F5F3EF]/65 hover:text-[#C6A77A] transition-colors"
      >
        <span>Scroll</span>
        <ChevronDown
          className={`h-4 w-4 text-[#C6A77A] ${prefersReducedMotion ? '' : 'animate-bounce'}`}
          strokeWidth={1.5}
        />
      </a>
    </section>
  );
}
