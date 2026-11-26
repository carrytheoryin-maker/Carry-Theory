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

  return (
    <span
      className={`font-display inline-flex items-center gap-3 text-sm sm:text-[15px] font-semibold uppercase tracking-[0.26em] text-[#F5F3EF] whitespace-nowrap shrink-0 ${className}`}
    >
      <img
        src={effectiveLogo}
        alt={`${brandName} logo`}
        referrerPolicy="no-referrer"
        className={`${imgClassName} select-none`}
      />
      <span>{brandName}</span>
    </span>
  );
}
