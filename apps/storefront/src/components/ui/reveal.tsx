'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * SSR-safe reveal-on-scroll wrapper; elements already scrolled above the viewport (`top < 0`) reveal immediately.
 */
export function Reveal({
  children,
  stagger = false,
  className,
  once = true,
}: {
  children: ReactNode;
  stagger?: boolean;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Already scrolled past (or already on screen) before the observer attached —
    // e.g. a reload that restores scroll position, or a #hash landing.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) setInView(true);
    else if (rect.top < 0) {
      setInView(true);
      if (once) return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div ref={ref} className={cn(stagger ? 'reveal-stagger' : 'reveal', inView && 'in', className)}>
      {children}
    </div>
  );
}
