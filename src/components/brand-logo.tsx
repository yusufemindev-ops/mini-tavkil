import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The Tavkil lockup: a seal and the name beside it.
 *
 * *Tavkil* (تَوْكِيل / tevkil) is delegation — appointing someone to act on your
 * behalf. That is the business: a buyer hands their sourcing to us and we act for
 * them in Türkiye. A tevkil is granted by a sealed document, so the mark is a
 * seal rather than a letter in a box.
 *
 * Round on purpose. Every marketplace ships a rounded square, and in a row of
 * browser tabs or app icons they are indistinguishable; a disc has a silhouette
 * of its own before anyone reads the glyph. The ring sits *inside* the disc so
 * the outline stays a clean circle at 16px, and the T is heavier than a typeface
 * would set it, because a seal is stamped rather than typed.
 *
 * The name is lowercase and tightly tracked — a marketplace, not a manufacturer —
 * with the dot of the "i" replaced by an orange square: a unit, the thing being
 * moved. That substitution only applies to the brand name itself; an
 * admin-supplied `siteName` renders plainly, since the trick is a piece of
 * lettering rather than a rule about text.
 *
 * There is no logo file, so the mark is drawn: no asset to keep in sync, correct
 * at any size, and identical on every machine. An uploaded `logoUrl` still wins.
 *
 * RTL: the wordmark is pinned `dir="ltr"` so a Latin name inside an Arabic page
 * is not reordered by bidi. The lockup as a whole still mirrors — the gap is
 * logical, so the seal leads on the correct side either way.
 */

/** The seal. Inline SVG rather than lucide: this is the brand mark, not an icon. */
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
        // Admin-supplied absolute URL of unknown dimensions; next/image would need
        // a remotePattern per deployment, and the mark is ~32px anyway.
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
            {/* The square sits over the printed dot rather than replacing the
                glyph, so the letter keeps its own spacing and the name stays
                selectable and readable to a screen reader. */}
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
