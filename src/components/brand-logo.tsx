import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The Tavkil lockup: a monogram tile and the wordmark beside it.
 *
 * There is no logo artwork, so the brand *is* type and CSS. Two things follow
 * from that. The typeface is Inter, already loaded for body copy — a wordmark is
 * a handful of glyphs, and pulling a second family for them would cost a render-
 * blocking font request to set six letters. And the tile is drawn rather than
 * drawn *on*: a gradient, a machined top edge, and a brand-tinted shadow, which
 * survives any size and both themes without an asset to keep in sync.
 *
 * Inter needs negative tracking at display sizes — its default fit is tuned for
 * paragraphs, and left alone the wordmark reads loose and unresolved next to the
 * tile. `-0.035em` closes it up without touching the counters.
 *
 * Previously this markup sat inline in both the header and the footer, in two
 * versions that had already drifted: the footer hard-coded `text-white` and
 * dropped the shadow. One component now serves both, and the admin-supplied
 * `logoUrl` still wins over all of it when a real asset exists.
 *
 * RTL: the wordmark is forced `dir="ltr"`. A Latin brand name inside an Arabic
 * page otherwise takes part in bidi reordering, and adjacent punctuation can jump
 * to the wrong end of it. The lockup as a whole still mirrors, because the gap is
 * a logical one — the tile leads on the correct side in both directions.
 */
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
  // The glyph runs to roughly 62% of the tile. At the 50% a default `text-base`
  // gives, the monogram floats in a field of orange and the mark reads as an
  // empty swatch at header size — it needs to fill its box to hold together.
  const tile = size === 'sm' ? 'size-8 text-[1.25rem]' : 'size-9 text-[1.4rem]';

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
          className={cn('rounded-[9px] object-cover', tile)}
          width={size === 'sm' ? 32 : 36}
          height={size === 'sm' ? 32 : 36}
        />
      ) : (
        <span aria-hidden className={cn('brand-tile grid place-items-center rounded-[9px]', tile)}>
          {/* Optical centring: the crossbar of a capital sits high, so the glyph
              needs nudging down inside a square to look centred rather than be
              centred. */}
          <span className="brand-tile-letter">{brandName.charAt(0).toUpperCase()}</span>
        </span>
      )}
      <span
        dir="ltr"
        className={cn(
          'brand-word text-[1.2rem] font-extrabold',
          tone === 'onDark' ? 'text-white' : 'text-foreground',
        )}
      >
        {brandName}
      </span>
    </Link>
  );
}
