import { useEffect, useRef, useState } from 'react';
import { toWebpAssetUrl } from '../utils/format';
import { isSafeUrl } from '../utils/sanitize';

export interface ImageDimensions {
  width: number;
  height: number;
  ratio: number;
}

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  fallbackLabel?: string;
  fitMode?: 'cover' | 'contain' | 'auto';
  targetRatio?: number;
  onDimensionsLoad?: (dims: ImageDimensions) => void;
}

export function SafeImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  style,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  fallbackLabel,
  fitMode,
  targetRatio = 4 / 3,
  onDimensionsLoad,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const [autoFitClass, setAutoFitClass] = useState<'object-cover' | 'object-contain'>(
    fitMode === 'contain' ? 'object-contain' : 'object-cover'
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailed(false);
    if (fitMode === 'contain') {
      setAutoFitClass('object-contain');
    } else if (fitMode === 'cover' || !fitMode) {
      setAutoFitClass('object-cover');
    }
  }, [src, fitMode]);

  const handleMeasure = (img: HTMLImageElement) => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return;
    const ratio = width / height;

    onDimensionsLoad?.({ width, height, ratio });

    if (fitMode === 'auto') {
      const fitsContainerCleanly =
        ratio >= targetRatio - 0.32 && ratio <= targetRatio + 0.55;
      setAutoFitClass(fitsContainerCleanly ? 'object-cover' : 'object-contain');
    }
  };

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      handleMeasure(img);
    }
  }, [src]);

  const safeSrc = isSafeUrl(src, false) ? src : undefined;
  const webpSrc = toWebpAssetUrl(safeSrc);

  if (!safeSrc || failed) {
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

  const resolvedClassName =
    fitMode === 'auto'
      ? `${className.replace(/\bobject-(cover|contain)\b/g, '').trim()} ${autoFitClass} ${
          autoFitClass === 'object-contain' ? 'bg-[#111111]' : ''
        }`.trim()
      : className;

  const imgElement = (
    <img
      ref={imgRef}
      src={safeSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      style={style}
      onLoad={(e) => handleMeasure(e.currentTarget)}
      onError={() => setFailed(true)}
      className={resolvedClassName}
    />
  );

  if (webpSrc) {
    return (
      <picture className="contents">
        <source srcSet={webpSrc} type="image/webp" />
        {imgElement}
      </picture>
    );
  }

  return imgElement;
}
