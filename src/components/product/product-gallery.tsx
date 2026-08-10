'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Thumb } from '@/components/catalog/thumb';
import type { PublicImage } from '@/lib/queries/public-product';

/**
 * Product gallery — vertical thumbnail strip plus a main panel that swaps on click.
 *
 * Simplified from Tavkil's: no Images/Video switch (no product carries a video and
 * the tab was permanently disabled), and no picsum prefetch. A product with one
 * image gets no strip at all rather than four identical placeholder thumbs.
 */
export function ProductGallery({
  images,
  productName,
  className,
}: {
  images: PublicImage[];
  productName: string;
  className?: string;
}) {
  const t = useTranslations('store');
  const [active, setActive] = useState(0);

  const activeIndex = Math.min(active, Math.max(images.length - 1, 0));
  const current = images[activeIndex];

  return (
    <div className={cn('lg:sticky lg:top-[calc(var(--height-nav)+1rem)]', className)}>
      <div className="flex gap-3">
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

        <div className="relative min-w-0 flex-1">
          <Thumb
            src={current?.url}
            // The <h1> next to it already names the product, so a repeated alt is
            // noise for a screen reader. Only a genuinely different alt is used.
            alt={current?.alt && current.alt !== productName ? current.alt : ''}
            className="border-border aspect-[4/3] rounded-lg border"
            priority
          />
        </div>
      </div>
    </div>
  );
}
