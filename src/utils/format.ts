import { useEffect } from 'react';

export function formatINR(amount: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString()}`;
  }
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, '').slice(0, 15);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function toWebpAssetUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('/assets/aistudio/') || !/\.(png|jpe?g)$/i.test(url)) {
    return null;
  }
  return url.replace(/\.(png|jpe?g)$/i, '.webp');
}

const preloadedImages = new Set<string>();

export function preloadImage(url?: string | null): void {
  if (typeof window === 'undefined' || !url) return;
  const preferredUrl = toWebpAssetUrl(url) || url;
  if (preloadedImages.has(preferredUrl)) return;
  preloadedImages.add(preferredUrl);
  const img = new Image();
  img.decoding = 'async';
  img.src = preferredUrl;
}

export function usePageSeo(options: {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | null;
}) {
  useEffect(() => {
    document.title = options.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
        } else if (selector.includes('name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', options.description);
    setMeta('meta[property="og:title"]', 'content', options.title);
    setMeta('meta[property="og:description"]', 'content', options.description);
    setMeta('meta[name="twitter:title"]', 'content', options.title);
    setMeta('meta[name="twitter:description"]', 'content', options.description);
    setMeta(
      'meta[name="robots"]',
      'content',
      options.noIndex ? 'noindex, nofollow' : 'index, follow'
    );

    const canonicalHref = `${window.location.origin}${options.canonicalPath ?? window.location.pathname}`;
    setMeta('meta[property="og:url"]', 'content', canonicalHref);

    const DEFAULT_OG_IMAGE =
      '/assets/aistudio/Warm_Studio_Still_Life_with_Tumblers_and_Mugs_2d1e9d8f.png';
    const rawOgImage = options.ogImage || DEFAULT_OG_IMAGE;
    const absoluteImg = rawOgImage.startsWith('http')
      ? rawOgImage
      : `${window.location.origin}${rawOgImage}`;
    setMeta('meta[property="og:image"]', 'content', absoluteImg);
    setMeta('meta[property="og:image:secure_url"]', 'content', absoluteImg);
    setMeta('meta[name="twitter:image"]', 'content', absoluteImg);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalHref);

    const existingJsonLd = document.getElementById('ct-dynamic-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }
    if (options.structuredData) {
      const script = document.createElement('script');
      script.id = 'ct-dynamic-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(options.structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const el = document.getElementById('ct-dynamic-jsonld');
      if (el) el.remove();
    };
  }, [
    options.title,
    options.description,
    options.canonicalPath,
    options.ogImage,
    options.noIndex,
    options.structuredData,
  ]);
}
