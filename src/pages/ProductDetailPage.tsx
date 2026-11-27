import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { QuickEnquiryModal } from '../components/QuickEnquiryModal';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl, formatINR, usePageSeo } from '../utils/format';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, siteConfig, addToCart, loading } = useStore();

  const product = useMemo(
    () => products.find((p) => p.slug === slug),
    [products, slug]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string>('description');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

  const recordImageRatio = (url: string | undefined, ratio: number) => {
    if (!url || !Number.isFinite(ratio) || ratio <= 0) return;
    setImageRatios((prev) => {
      if (prev[url] && Math.abs(prev[url] - ratio) < 0.01) return prev;
      return { ...prev, [url]: ratio };
    });
  };

  useEffect(() => {
    if (product) {
      const firstAvail =
        product.variants.find((v) => v.available && v.stock > 0) ||
        product.variants[0];
      setSelectedVariantId(firstAvail?.id || '');
      setActiveImageIndex(0);
      setQuantity(1);
    }
  }, [product?.id]);

  const activeVariant = useMemo(() => {
    if (!product || product.variants.length === 0) return undefined;
    return product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  }, [product, selectedVariantId]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const base = [...product.images];
    if (activeVariant?.imageUrl && !base.some((img) => img.url === activeVariant.imageUrl)) {
      base.unshift({ url: activeVariant.imageUrl, alt: `${product.name} — ${activeVariant.label}` });
    }
    return base;
  }, [product, activeVariant]);

  useEffect(() => {
    if (activeVariant?.imageUrl) {
      const idx = galleryImages.findIndex((g) => g.url === activeVariant.imageUrl);
      if (idx >= 0) setActiveImageIndex(idx);
    }
  }, [activeVariant?.id, galleryImages]);

  const currentPrice = activeVariant ? activeVariant.price : product?.price || 0;
  const currentStock = activeVariant ? activeVariant.stock : product?.stock || 0;
  const isAvailable = activeVariant
    ? activeVariant.available && activeVariant.stock > 0
    : currentStock > 0;

  // Product Schema.org JSON-LD (no SKU exposed)
  const productJsonLd = useMemo(() => {
    if (!product) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription || product.description,
      brand: {
        '@type': 'Brand',
        name: 'Carry Theory',
      },
      image: galleryImages.map((img) =>
        img.url.startsWith('http') ? img.url : `${window.location.origin}${img.url}`
      ),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: currentPrice,
        url: window.location.href,
      },
    };
  }, [product, currentPrice, galleryImages]);

  usePageSeo({
    title: product ? `${product.name} — Carry Theory` : 'Product — Carry Theory',
    description:
      product?.shortDescription ||
      'Explore Carry Theory luxury everyday essentials.',
    canonicalPath: slug ? `/products/${slug}` : '/shop',
    ogImage: galleryImages[0]?.url,
    structuredData: productJsonLd,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] pt-32 pb-20 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px] grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 aspect-[4/3] bg-[#141414] animate-pulse" />
          <div className="lg:col-span-5 h-96 bg-[#141414] animate-pulse" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-36 pb-24 px-5 text-center">
        <h1 className="font-display text-3xl font-semibold">Product Not Found</h1>
        <p className="mt-3 text-sm text-[#F5F3EF]/65">
          The essential you are looking for is unavailable or has moved.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-block bg-[#F5F3EF] px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors"
        >
          Return to Shop
        </Link>
      </main>
    );
  }

  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      if (a.categorySlug === product.categorySlug && b.categorySlug !== product.categorySlug) return -1;
      if (b.categorySlug === product.categorySlug && a.categorySlug !== product.categorySlug) return 1;
      return 0;
    })
    .slice(0, 4);

  const whatsapp = siteConfig?.whatsappNumber || '+91 9742597425';

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || galleryImages.length <= 1) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        setActiveImageIndex((i) => (i + 1) % galleryImages.length);
      } else {
        setActiveImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
      }
    }
    setTouchStartX(null);
  };

  const handleBuyNow = () => {
    if (!isAvailable) return;
    addToCart(product, activeVariant, quantity, false);
    navigate('/checkout');
  };

  const accordionItems = [
    {
      id: 'description',
      title: 'Product Description',
      content: (
        <p className="text-sm leading-relaxed text-[#F5F3EF]/75 whitespace-pre-line">
          {product.description}
        </p>
      ),
    },
    {
      id: 'specifications',
      title: 'Product Specifications',
      content:
        product.specifications.length > 0 ? (
          <dl className="divide-y divide-[#F5F3EF]/10 text-sm">
            {product.specifications.map((spec) => (
              <div key={spec.label} className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#F5F3EF]/55">{spec.label}</dt>
                <dd className="text-right text-[#F5F3EF]">{spec.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-[#F5F3EF]/65">Crafted to Carry Theory studio specifications.</p>
        ),
    },
    {
      id: 'variants',
      title: 'Available Variants',
      content:
        product.variants.length > 0 ? (
          <ul className="divide-y divide-[#F5F3EF]/10 text-sm">
            {product.variants.map((v) => (
              <li key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-[#F5F3EF]/85">{v.label}</span>
                <span className="tabular-nums text-xs">
                  <span className="text-[#F5F3EF]">{formatINR(v.price)}</span>
                  <span className="mx-1.5 text-[#F5F3EF]/35">·</span>
                  <span className={v.available && v.stock > 0 ? 'text-[#FF8A3D] font-medium' : 'text-[#F5F3EF]/45'}>
                    {v.available && v.stock > 0 ? `Only ${v.stock} pieces left` : 'Unavailable'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#F5F3EF]/65">Single signature edition.</p>
        ),
    },
    {
      id: 'customisation',
      title: 'Customisation Options',
      content: (
        <p className="text-sm leading-relaxed text-[#F5F3EF]/75">
          {product.customisable
            ? 'This product is customisable. Select customisation at checkout and our team will contact you regarding the details.'
            : product.customisationOptions || 'Finished in our signature studio aesthetic.'}
        </p>
      ),
    },
    {
      id: 'shipping',
      title: 'Shipping Information',
      content: (
        <p className="text-sm leading-relaxed text-[#F5F3EF]/75">
          {product.shippingInfo || siteConfig?.shippingPolicyText}
        </p>
      ),
    },
    {
      id: 'replacement',
      title: '7-Day Replacement Policy',
      content: (
        <p className="text-sm leading-relaxed text-[#F5F3EF]/75">
          {product.replacementPolicy || siteConfig?.replacementPolicyText}
        </p>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-[0.18em] text-[#F5F3EF]/50 flex flex-wrap items-center gap-2"
        >
          <Link to="/" className="hover:text-[#C6A77A] transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={`/collections/${product.categorySlug}`} className="hover:text-[#C6A77A] transition-colors">
            {product.categoryName}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#C6A77A]">{product.name}</span>
        </nav>

        {/* Main Product Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left: Product Image Gallery */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
            {(() => {
              const activeImage = galleryImages[activeImageIndex];
              const activeUrl = activeImage?.url || '';
              const rawRatio = (activeUrl && imageRatios[activeUrl]) || 4 / 3;
              const displayRatio = Math.min(1.85, Math.max(0.72, rawRatio));

              return (
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{ aspectRatio: String(displayRatio), maxHeight: '78vh' }}
                  className="relative w-full overflow-hidden bg-[#111111] border border-[#F5F3EF]/12 group flex items-center justify-center transition-[aspect-ratio] duration-300"
                >
                  <div
                    onClick={() => setZoomed((z) => !z)}
                    className={`h-full w-full flex items-center justify-center transition-transform duration-500 ease-out cursor-zoom-in ${
                      zoomed ? 'scale-125 cursor-zoom-out' : 'scale-100'
                    }`}
                  >
                    <SafeImage
                      src={activeUrl}
                      alt={activeImage?.alt || product.name}
                      loading="eager"
                      onDimensionsLoad={(dims) => recordImageRatio(activeUrl, dims.ratio)}
                      className="max-h-[78vh] h-full w-full object-contain"
                    />
                  </div>

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous product image"
                        onClick={() =>
                          setActiveImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center bg-[#0B0B0B]/75 border border-[#F5F3EF]/20 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next product image"
                        onClick={() =>
                          setActiveImageIndex((i) => (i + 1) % galleryImages.length)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center bg-[#0B0B0B]/75 border border-[#F5F3EF]/20 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setFullscreenOpen(true)}
                    aria-label="Open fullscreen gallery"
                    className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center bg-[#0B0B0B]/80 border border-[#F5F3EF]/20 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
                  >
                    <Expand className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}

            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => {
                  const thumbRatio = Math.min(1.65, Math.max(0.72, imageRatios[img.url] || 4 / 3));
                  const thumbWidth = Math.round(80 * thumbRatio);
                  return (
                    <button
                      key={`${img.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setZoomed(false);
                      }}
                      style={{ width: `${thumbWidth}px`, height: '80px' }}
                      className={`shrink-0 overflow-hidden bg-[#111111] border transition-colors cursor-pointer ${
                        idx === activeImageIndex
                          ? 'border-[#C6A77A]'
                          : 'border-[#F5F3EF]/12 opacity-65 hover:opacity-100'
                      }`}
                    >
                      <SafeImage
                        src={img.url}
                        alt={img.alt}
                        onDimensionsLoad={(dims) => recordImageRatio(img.url, dims.ratio)}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Purchase & Details Module */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border-b border-[#F5F3EF]/12 pb-6">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-[#C6A77A]">
                <span>{product.categoryName}</span>
                {product.badge && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{product.badge}</span>
                  </>
                )}
              </div>

              <h1 className="mt-2 font-display text-2xl sm:text-4xl font-semibold tracking-[-0.015em] text-[#F5F3EF]">
                {product.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="tabular-nums text-2xl font-semibold text-[#F5F3EF]">
                  {formatINR(currentPrice)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                  <span className="tabular-nums text-sm text-[#F5F3EF]/40 line-through">
                    {formatINR(product.compareAtPrice)}
                  </span>
                )}
                <span className="text-xs text-[#F5F3EF]/50">Inclusive of taxes</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#F5F3EF]/75">
                {product.shortDescription}
              </p>

              {/* High-Contrast Scarcity Callout (Separate Attention Colour) */}
              <div className="mt-4 inline-flex items-center gap-2.5 border border-[#FF8A3D]/45 bg-[#FF8A3D]/10 px-3.5 py-2 text-xs font-semibold tracking-[0.04em] text-[#FF8A3D] tabular-nums">
                <span className="h-2 w-2 rounded-full bg-[#FF8A3D] animate-pulse" aria-hidden="true" />
                <span>
                  {isAvailable
                    ? `Hurry — Only ${currentStock} ${currentStock === 1 ? 'piece' : 'pieces'} available`
                    : 'Currently unavailable'}
                </span>
              </div>
            </div>

            {/* Variants / Swatches */}
            {product.variants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                  <span className="text-[#F5F3EF]/65">Select Option</span>
                  <span className="text-[#C6A77A]">{activeVariant?.label}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((variant) => {
                    const selected = variant.id === activeVariant?.id;
                    const disabled = !variant.available || variant.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity(1);
                        }}
                        className={`inline-flex items-center gap-2.5 border px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#C6A77A] bg-[#C6A77A]/12 text-[#F5F3EF]'
                            : 'border-[#F5F3EF]/18 text-[#F5F3EF]/75 hover:border-[#C6A77A]/60'
                        } ${disabled ? 'opacity-45' : ''}`}
                      >
                        {variant.colorHex && (
                          <span
                            style={{ backgroundColor: variant.colorHex }}
                            className="h-3.5 w-3.5 rounded-full border border-[#F5F3EF]/35 shrink-0"
                          />
                        )}
                        <span>{variant.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customisation Notice (Fee shown on Checkout only) */}
            {product.customisable && (
              <div className="border border-[#C6A77A]/35 bg-[#121212] p-4 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-[#C6A77A] mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold uppercase tracking-[0.14em] text-[#C6A77A]">
                    Customisable
                  </p>
                  <p className="mt-1 text-[#F5F3EF]/75">
                    Select the customisation option at checkout and our team will contact you regarding customisation.
                  </p>
                </div>
              </div>
            )}

            {/* Quantity + Primary & Secondary CTAs */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center border border-[#F5F3EF]/20 h-12">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-full w-11 items-center justify-center text-[#F5F3EF]/80 hover:text-[#C6A77A] cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="tabular-nums w-10 text-center text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, currentStock), q + 1))}
                    aria-label="Increase quantity"
                    disabled={!isAvailable || quantity >= currentStock}
                    className="flex h-full w-11 items-center justify-center text-[#F5F3EF]/80 hover:text-[#C6A77A] disabled:opacity-35 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => addToCart(product, activeVariant, quantity, true)}
                  className="flex-1 h-12 inline-flex items-center justify-center gap-2.5 bg-[#F5F3EF] px-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{isAvailable ? 'ADD TO CART' : 'OUT OF STOCK'}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!isAvailable}
                onClick={handleBuyNow}
                className="w-full h-12 border border-[#F5F3EF]/60 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                BUY NOW
              </button>

              {product.customisable && (
                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEnquiryOpen(true)}
                    className="flex-1 h-11 border border-[#C6A77A]/55 bg-[#121212] px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C6A77A] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    ASK ABOUT CUSTOMISATION
                  </button>
                  <a
                    href={buildWhatsAppUrl(
                      whatsapp,
                      `Hello Carry Theory, I would like to ask about customising ${product.name} (${activeVariant?.label || ''}).`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-[#F5F3EF]/20 px-4 text-[11px] uppercase tracking-[0.18em] text-[#F5F3EF]/85 hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#C6A77A]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* Expandable Details */}
            <div className="border-t border-[#F5F3EF]/12 divide-y divide-[#F5F3EF]/12">
              {accordionItems.map((section) => {
                const isOpen = openSection === section.id;
                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => setOpenSection(isOpen ? '' : section.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#F5F3EF] hover:text-[#C6A77A] transition-colors cursor-pointer"
                    >
                      <span>{section.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#C6A77A] transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && <div className="pb-5">{section.content}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-24 border-t border-[#F5F3EF]/12 pt-16">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
              Complementary Forms
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold uppercase tracking-[-0.01em]">
              YOU MAY ALSO LIKE.
            </h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {fullscreenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen product gallery"
          className="fixed inset-0 z-50 bg-[#0B0B0B]/96 flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setFullscreenOpen(false)}
            aria-label="Close fullscreen gallery"
            className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center border border-[#F5F3EF]/25 text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-[82vh] max-w-5xl w-full overflow-hidden border border-[#F5F3EF]/12">
            <SafeImage
              src={galleryImages[activeImageIndex]?.url}
              alt={galleryImages[activeImageIndex]?.alt || product.name}
              className="max-h-[82vh] w-full object-contain bg-[#111111]"
            />
          </div>
        </div>
      )}

      <QuickEnquiryModal
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        productName={product.name}
      />
    </main>
  );
}
