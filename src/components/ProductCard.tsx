import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, ProductImage } from '../types';
import { formatINR, preloadImage } from '../utils/format';
import { SafeImage } from './SafeImage';
import { StarRating } from './StarRating';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

function getCardImageStyle(image?: ProductImage): CSSProperties | undefined {
  if (!image) return undefined;
  const style: CSSProperties = {};
  if (image.coverPosition) {
    style.objectPosition = image.coverPosition;
  }
  if (image.coverScale && image.coverScale !== 1) {
    style.transform = `scale(${image.coverScale})`;
    style.transformOrigin = image.coverOrigin || '50% 50%';
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addToCart } = useStore();
  const primaryImage = product.images[0];
  const alternateImage = product.images[1];

  useEffect(() => {
    if (alternateImage?.url) {
      preloadImage(alternateImage.url);
    }
  }, [alternateImage?.url]);

  const defaultVariant =
    product.variants.find((v) => v.available && v.stock > 0) || product.variants[0];
  const isAvailable = product.variants.length > 0
    ? product.variants.some((v) => v.available && v.stock > 0)
    : product.stock > 0;
  const displayPrice = defaultVariant ? defaultVariant.price : product.price;
  const displayStock = defaultVariant ? defaultVariant.stock : product.stock;

  const uniqueColors = product.variants
    .filter((v) => v.colorHex)
    .reduce<{ name: string; hex: string }[]>((acc, v) => {
      if (v.colorHex && !acc.some((item) => item.hex === v.colorHex)) {
        acc.push({ name: v.colorName || v.label, hex: v.colorHex });
      }
      return acc;
    }, []);

  return (
    <article
      onMouseEnter={() => {
        if (alternateImage?.url) preloadImage(alternateImage.url);
      }}
      className="group flex flex-col bg-[#121212] border border-[#F5F3EF]/10 hover:border-[#C6A77A]/45 transition-colors duration-200"
    >
      {/* Image Frame */}
      <Link
        to={`/products/${product.slug}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#161616]"
      >
        <div className="h-full w-full transition-transform duration-200 ease-out group-hover:scale-[1.03]">
          <SafeImage
            src={primaryImage?.url || ''}
            alt={primaryImage?.alt || product.name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            style={getCardImageStyle(primaryImage)}
            className="h-full w-full object-cover"
          />
        </div>
        {alternateImage?.url && (
          <div className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 pointer-events-none">
            <div className="h-full w-full transition-transform duration-200 ease-out group-hover:scale-[1.03]">
              <SafeImage
                src={alternateImage.url}
                alt={alternateImage.alt || product.name}
                loading="eager"
                style={getCardImageStyle(alternateImage)}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Quick View Indicator on Desktop Hover */}
        <span className="pointer-events-none hidden lg:inline-flex items-center gap-1.5 absolute bottom-3 right-3 bg-[#0B0B0B]/88 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#F5F3EF] opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 border border-[#C6A77A]/35">
          View Details
          <ArrowRight className="h-3 w-3 text-[#C6A77A]" />
        </span>
      </Link>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 xl:p-6">
        <div>
          {/* Unboxed Metadata Line */}
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em]">
            <span className="text-[#F5F3EF]/50 truncate">{product.categoryName}</span>
            {product.badge && (
              <span className="text-[#C6A77A] shrink-0">{product.badge}</span>
            )}
          </div>

          <Link to={`/products/${product.slug}`} className="block mt-2">
            <h3 className="font-display text-base sm:text-[17px] font-semibold text-[#F5F3EF] group-hover:text-[#C6A77A] transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1.5">
            <StarRating
              rating={product.rating ?? 4.7}
              reviewCount={product.reviewCount ?? 45}
            />
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#F5F3EF]/60 line-clamp-2">
            {product.shortDescription}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-[#F5F3EF]/10 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="tabular-nums text-[15px] font-semibold text-[#F5F3EF]">
                {formatINR(displayPrice)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > displayPrice && (
                <span className="tabular-nums text-xs text-[#F5F3EF]/40 line-through">
                  {formatINR(product.compareAtPrice)}
                </span>
              )}
            </div>

            {uniqueColors.length > 0 && (
              <div className="flex items-center gap-1.5" aria-label="Available finishes">
                {uniqueColors.map((c) => (
                  <span
                    key={`${c.name}-${c.hex}`}
                    title={c.name}
                    style={{ backgroundColor: c.hex }}
                    className="h-3.5 w-3.5 rounded-full border border-[#F5F3EF]/30"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Scarcity Indicator (Distinct Vivid Ember Accent) & Customisation Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1.5 font-semibold tracking-[0.04em] text-[#FF8A3D] tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A3D]" aria-hidden="true" />
                Only {displayStock} {displayStock === 1 ? 'piece' : 'pieces'} left
              </span>
            ) : (
              <span className="text-[#F5F3EF]/45">Sold Out</span>
            )}

            {product.customisable && (
              <span className="inline-flex items-center gap-1 text-[#C6A77A]">
                <Sparkles className="h-3 w-3" />
                <span>Customisable</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => addToCart(product, defaultVariant, 1, true)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-[#F5F3EF] px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
              <span>{isAvailable ? 'Add to Cart' : 'Unavailable'}</span>
            </button>

            <Link
              to={`/products/${product.slug}`}
              className="inline-flex items-center justify-center border border-[#F5F3EF]/20 px-3 sm:px-3.5 py-2.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] sm:tracking-[0.16em] text-[#F5F3EF]/85 hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors whitespace-nowrap shrink-0"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
