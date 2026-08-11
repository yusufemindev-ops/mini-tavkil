import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AdminProduct } from './queries';

// Product primary-image thumbnail. A subtle brand-tinted placeholder box sits
// BEHIND the image and stays visible while it loads; the image itself fades in on
// load (no flash, no sudden pop). The `ref` check covers cached images —
// otherwise a cached image whose `onLoad` never fires would stay at opacity-0.
/**
 * A row thumbnail sits next to the product name that already says what it is, so
 * an empty alt is the correct outcome when there is no real alt text — never the
 * stringified translation record, which is what `image.alt ?? ''` produced.
 */
function altText(alt: Record<string, string> | null): string {
  if (!alt) return '';
  return (alt.en ?? Object.values(alt)[0] ?? '').trim();
}

export function ProductThumb({
  product,
  className,
}: {
  product: AdminProduct;
  className?: string;
}) {
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const [loaded, setLoaded] = useState(false);

  if (!image) {
    return (
      <span className={cn('bg-primary/10 size-9 flex-none rounded-md', className)} aria-hidden />
    );
  }
  return (
    <span
      className={cn(
        'bg-primary/10 border-border block size-9 flex-none overflow-hidden rounded-md border',
        className,
      )}
    >
      <img
        src={image.url}
        alt={altText(image.alt)}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete) setLoaded(true);
        }}
        className={cn(
          'size-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  );
}
