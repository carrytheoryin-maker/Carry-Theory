import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { SiteConfig } from '../types';

interface FlashlightHeroProps {
  siteConfig: SiteConfig;
}

export function FlashlightHero({ siteConfig }: FlashlightHeroProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const reveal = revealRef.current;
    if (!container || !reveal) return;

    const updateRadius = () => {
      const w = container.clientWidth;
      // Medium spotlight reach: ~400px–500px diameter on desktop, ~310px on mobile
      const radius = w < 640 ? 155 : Math.min(250, Math.max(195, Math.round(w * 0.175)));
      reveal.style.setProperty('--spot-r', `${radius}px`);
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);

    if (prefersReducedMotion) {
      reveal.style.setProperty('--spot-x', '56%');
      reveal.style.setProperty('--spot-y', '48%');
      return () => window.removeEventListener('resize', updateRadius);
    }

    let targetX = container.clientWidth * 0.56;
    let targetY = container.clientHeight * 0.48;
    let currentX = container.clientWidth * 0.38;
    let currentY = container.clientHeight * 0.52;
    let userInteracted = false;
    let frameId = 0;
    let idlePhase = 0;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

      if (!userInteracted) {
        if (elapsed < 1800) {
          const progress = Math.min(1, elapsed / 1800);
          const eased = 1 - Math.pow(1 - progress, 3);
          targetX = container.clientWidth * (0.36 + 0.22 * eased);
          targetY = container.clientHeight * (0.54 - 0.06 * eased);
        } else if (isCoarsePointer) {
          idlePhase += 0.012;
          targetX = container.clientWidth * (0.52 + 0.2 * Math.sin(idlePhase));
          targetY = container.clientHeight * (0.48 + 0.08 * Math.cos(idlePhase * 0.8));
        }
      }

      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      reveal.style.setProperty('--spot-x', `${currentX.toFixed(1)}px`);
      reveal.style.setProperty('--spot-y', `${currentY.toFixed(1)}px`);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      userInteracted = true;
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = container.getBoundingClientRect();
      userInteracted = true;
      targetX = e.touches[0].clientX - rect.left;
      targetY = e.touches[0].clientY - rect.top;
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateRadius);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [prefersReducedMotion]);

  const heroSrc =
    siteConfig.heroImageUrl ||
    '/assets/aistudio/Warm_Studio_Travel_Gear_Showcase_7935f27e.png';

  return (
    <section
      ref={containerRef}
      aria-label="Carry Theory Showcase"
      className="relative min-h-[82svh] sm:min-h-[92svh] lg:min-h-[100svh] w-full overflow-hidden bg-[#0B0B0B] flex items-end"
    >
      {/* Layer 1: Darkened Showroom Base */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-0 pointer-events-none select-none"
      >
        <div className="h-full w-full opacity-[0.24] sm:opacity-[0.18] brightness-90">
          <img
            src={heroSrc}
            alt="Carry Theory curated essentials showcase"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain lg:object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-[#0B0B0B]/55" />
      </motion.div>

      {/* Layer 2: Medium-Size Mouse-Following Flashlight Reveal */}
      <div
        ref={revealRef}
        aria-hidden="true"
        className="hero-flashlight-reveal absolute inset-0 z-[1] pointer-events-none select-none"
      >
        <img
          src={heroSrc}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain lg:object-cover object-center brightness-[1.12] contrast-[1.05] saturate-[1.04]"
        />
      </div>

      {/* Layer 3: Protective Contrast Scrim Above Flashlight & Below Headline Text */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 68% 58% at 18% 88%, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.72) 45%, rgba(11,11,11,0.18) 80%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-[5] h-[42%] pointer-events-none bg-gradient-to-t from-[#0B0B0B]/92 via-[#0B0B0B]/45 to-transparent"
      />

      {/* Layer 4: Hero Typography & Actions (Always Crisp & High Contrast) */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 pb-12 sm:pb-14 lg:pb-16 pt-28">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#C6A77A] mb-3 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
            {siteConfig.brandName}
          </p>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-[2.85rem] font-semibold uppercase tracking-[-0.02em] leading-[1.08] text-[#F5F3EF] drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
            <span className="block">{siteConfig.heroHeadingLine1}</span>
            <span className="block mt-1 text-[#F5F3EF]">{siteConfig.heroHeadingLine2}</span>
          </h1>

          <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-[#F5F3EF]/88 drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)]">
            {siteConfig.heroSubheading}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center bg-[#F5F3EF] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors duration-200 whitespace-nowrap shrink-0 shadow-lg"
            >
              {siteConfig.heroPrimaryCta}
            </Link>

            <Link
              to="/about"
              className="inline-flex items-center justify-center border border-[#F5F3EF]/70 bg-[#0B0B0B]/70 backdrop-blur-xs px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              {siteConfig.heroSecondaryCta}
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <a
        href="#brand-positioning"
        aria-label="Scroll to brand positioning"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.26em] text-[#F5F3EF]/65 hover:text-[#C6A77A] transition-colors"
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
