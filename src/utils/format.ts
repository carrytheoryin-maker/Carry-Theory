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
  const digits = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function usePageSeo(options: {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
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

    const canonicalHref = `${window.location.origin}${options.canonicalPath ?? window.location.pathname}`;
    setMeta('meta[property="og:url"]', 'content', canonicalHref);

    if (options.ogImage) {
      const absoluteImg = options.ogImage.startsWith('http')
        ? options.ogImage
        : `${window.location.origin}${options.ogImage}`;
      setMeta('meta[property="og:image"]', 'content', absoluteImg);
    }

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
  }, [options.title, options.description, options.canonicalPath, options.ogImage, options.structuredData]);
}
