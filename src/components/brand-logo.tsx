import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand logo lockup component combining SVG seal and brand wordmark.
 * Uses dir="ltr" on wordmark to prevent bidi reordering in RTL layouts.
 */
function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <circle cx="32" cy="32" r="32" className="brand-seal-disc" />
      <circle
        cx="32"
        cy="32"
        r="24.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="brand-seal-ring"
      />
      <path d="M19 23.5h26v9.5h-8v20h-10v-20h-8Z" fill="currentColor" />
    </svg>
  );
}

const BRAND = 'tavkil';

export function BrandLogo({
  siteName = 'Tavkil',
  logoUrl = '',
  size = 'sm',
  tone = 'default',
  className,
  onNavigate,
}: {
  siteName?: string;
  logoUrl?: string;
  /** `sm` in the header, `md` in the footer. */
  size?: 'sm' | 'md';
  /** `onDark` pins the wordmark white for the footer's dark panel. */
  tone?: 'default' | 'onDark';
  className?: string;
  onNavigate?: () => void;
}) {
  const brandName = siteName || 'Tavkil';
  const mark = size === 'sm' ? 'size-8' : 'size-9';
  const isBrand = brandName.toLowerCase() === BRAND;

  return (
    <Link
      href="/"
      aria-label={brandName}
      onClick={onNavigate}
      className={cn('brand-logo group flex items-center gap-2.5', className)}
    >
      {logoUrl ? (
        // Admin-supplied logo URL fallback to <img> to support any external host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn('rounded-full object-cover', mark)}
          width={size === 'sm' ? 32 : 36}
          height={size === 'sm' ? 32 : 36}
        />
      ) : (
        <Seal className={cn('brand-seal flex-none', mark)} />
      )}

      <span
        dir="ltr"
        className={cn(
          'brand-word text-[1.24rem] font-extrabold',
          tone === 'onDark' ? 'text-white' : 'text-foreground',
        )}
      >
        {isBrand ? (
          <>
            tavk
            {/* Overlay dot preserves native glyph spacing and accessibility. */}
            <span className="brand-i">
              i<span aria-hidden className="brand-i-dot" />
            </span>
            l
          </>
        ) : (
          brandName
        )}
      </span>
    </Link>
  );
}
