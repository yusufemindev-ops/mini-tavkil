'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Image tile with a tinted brand gradient underneath, matching the prototype `.ph`.
 *
 * Two differences from Tavkil's version. It has no picsum.photos placeholder — a
 * production page must not fetch decorative images from a third party, and step
 * 14h's CSP names its `img-src` hosts explicitly. And the
 * gradient is not decoration: it *is* the empty state, so a product whose image
 * hasn't been uploaded yet renders as a deliberate brand-coloured tile rather than
 * a hole.
 *
 * A failed load (a stored URL whose object is gone) is caught and hidden, so a
 * missing file never shows a broken-image icon.
 */
export function Thumb({
  src,
  alt = '',
  color = 'var(--primary)',
  className,
  priority = false,
}: {
  src?: string | null;
  /** Empty string marks the image decorative — correct when a heading repeats it. */
  alt?: string;
  color?: string;
  className?: string;
  /** Set on the above-the-fold image so it isn't lazy-loaded (LCP). */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Fade in over the gradient rather than popping. The `ref` check covers cached
  // images, whose `onLoad` never fires — without it they would stay invisible.
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(circle at 30% 22%, color-mix(in srgb, ${color} 45%, var(--background-2)), var(--background-2))`,
      }}
    >
      {src && !failed && (
        // R2 objects have no stored dimensions (see PLAN.md §5), and the fixed
        // aspect-ratio wrapper already reserves the space next/image would.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
          onLoad={() => setLoaded(true)}
          ref={(el) => {
            if (el?.complete) setLoaded(true);
          }}
          onError={() => setFailed(true)}
          className={cn(
            'pointer-events-none absolute inset-0 size-full select-none object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
