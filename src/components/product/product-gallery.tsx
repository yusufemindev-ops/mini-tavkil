'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumb } from '@/components/catalog/thumb';
import type { PublicImage } from '@/lib/queries/public-product';

/**
 * Product gallery — Tavkil's, with the vertical thumbnail strip, the main panel
 * that swaps on click, and the Images/Video switch intact.
 *
 * Two changes, both forced rather than chosen. The seeded-placeholder strip is
 * gone because it fetched from picsum.photos, which step 14h's CSP blocks and
 * which a production page should not do anyway — `Thumb` falls back to the brand
 * gradient instead. And `product_images` carries no video column, so the Video
 * tab renders in its disabled state exactly as it did in Tavkil when a product
 * had none.
 */
type Mode = 'images' | 'video';

export function ProductGallery({
  images,
  productName,
  badge,
  className,
}: {
  images: PublicImage[];
  productName: string;
  badge?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('store');
  const [mode, setMode] = useState<Mode>('images');
  const [active, setActive] = useState(0);

  const activeIndex = Math.min(active, Math.max(images.length - 1, 0));
  const current = images[activeIndex];
  // Alt only when the admin wrote something other than the product name — the
  // <h1> beside it already announces that.
  const altFor = (image?: PublicImage) =>
    image?.alt && image.alt !== productName ? image.alt : '';

  return (
    <div className={cn('lg:sticky lg:top-[calc(var(--height-nav)+1rem)]', className)}>
      {/* Images / Video switch */}
      <div className="border-border bg-card mb-3 inline-flex rounded-md border p-0.5">
        <ModeTab active={mode === 'images'} onClick={() => setMode('images')}>
          <ImageIcon className="size-3.5" />
          {t('gallery_images')}
        </ModeTab>
        <ModeTab active={mode === 'video'} disabled onClick={() => undefined}>
          <Play className="size-3.5" />
          {t('gallery_video')}
        </ModeTab>
      </div>

      <div className="flex gap-3">
        {/* Vertical thumbnail strip — one thumb per real upload. */}
        {images.length > 1 && (
          <div className="flex w-[68px] flex-none flex-col gap-3 sm:w-[76px]">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActive(index)}
                aria-label={t('gallery_thumb', { n: index + 1 })}
                aria-pressed={index === activeIndex}
                className={cn(
                  'overflow-hidden rounded-lg border transition-all',
                  index === activeIndex
                    ? 'border-primary ring-primary/25 ring-2'
                    : 'border-border opacity-60 hover:opacity-100',
                )}
              >
                <Thumb src={image.url} className="aspect-square" />
              </button>
            ))}
          </div>
        )}

        {/* Main panel */}
        <div className="relative min-w-0 flex-1">
          <Thumb
            src={current?.url}
            alt={altFor(current)}
            className="border-border aspect-[4/3] rounded-lg border"
            priority
          />
          {badge && <div className="absolute start-3 top-3">{badge}</div>}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.82rem] font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'hover:text-muted-foreground cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}
