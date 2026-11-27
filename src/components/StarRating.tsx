import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  showReviewsLabel?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  reviewCount,
  size = 'sm',
  showReviewsLabel = false,
  className = '',
}: StarRatingProps) {
  const clampedRating = Math.min(5, Math.max(0, rating));
  const iconClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const textClass = size === 'md' ? 'text-xs sm:text-[13px]' : 'text-[11px]';

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={`Rated ${clampedRating.toFixed(1)} out of 5 stars based on ${reviewCount} reviews`}
    >
      <div className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => {
          const fillFraction = Math.min(1, Math.max(0, clampedRating - index));
          const fillPercent = Math.round(fillFraction * 100);

          return (
            <span key={index} className={`relative inline-block ${iconClass}`}>
              <Star
                className={`${iconClass} text-[#F5F3EF]/20 fill-[#F5F3EF]/10`}
                strokeWidth={1.5}
              />
              {fillPercent > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star
                    className={`${iconClass} text-[#C6A77A] fill-[#C6A77A]`}
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>

      <span className={`tabular-nums inline-flex items-center gap-1 ${textClass}`}>
        <span className="font-semibold text-[#F5F3EF]">{clampedRating.toFixed(1)}</span>
        <span className="text-[#F5F3EF]/55">
          ({reviewCount}
          {showReviewsLabel ? ' reviews' : ''})
        </span>
      </span>
    </div>
  );
}
