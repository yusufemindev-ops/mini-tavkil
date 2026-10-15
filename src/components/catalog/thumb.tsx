'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Image tile with a tinted brand-gradient fallback when missing or failed to load.
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
  // Check `el.complete` via ref so cached images whose `onLoad` already fired still fade in.
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(circle at 30% 22%, color-mix(in srgb, ${color} 45%, var(--background-2)), var(--background-2))`,
      }}
    >
      {src && !failed && (
        // R2 objects have no stored dimensions; the fixed aspect-ratio wrapper reserves layout space.
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
            'pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500 select-none',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
