import { toWebpAssetUrl } from '../utils/format';

interface BrandLogoProps {
  logoUrl?: string;
  brandName?: string;
  className?: string;
  imgClassName?: string;
}

export function BrandLogo({
  logoUrl = '/assets/aistudio/logo-transparent.png',
  brandName = 'Carry Theory',
  className = '',
  imgClassName = 'h-7 sm:h-8 w-auto object-contain',
}: BrandLogoProps) {
  const effectiveLogo = logoUrl || '/assets/aistudio/logo-transparent.png';
  const webpLogo = toWebpAssetUrl(effectiveLogo);

  return (
    <span
      className={`font-display inline-flex items-center gap-3 text-sm sm:text-[15px] font-semibold uppercase tracking-[0.26em] text-[#F5F3EF] whitespace-nowrap shrink-0 ${className}`}
    >
      <picture className="contents">
        {webpLogo && <source srcSet={webpLogo} type="image/webp" />}
        <img
          src={effectiveLogo}
          alt={`${brandName} logo`}
          loading="eager"
          decoding="async"
          className={`${imgClassName} select-none`}
        />
      </picture>
      <span>{brandName}</span>
    </span>
  );
}
