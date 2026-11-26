import { useState } from 'react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallbackLabel?: string;
}

export function SafeImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  loading = 'lazy',
  fallbackLabel,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#141414] border border-[#F5F3EF]/10 text-center px-6 ${className}`}
      >
        <div className="h-8 w-8 border border-[#C6A77A]/40 rotate-45 mb-3" aria-hidden="true" />
        <span className="text-xs uppercase tracking-[0.2em] text-[#F5F3EF]/50">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
