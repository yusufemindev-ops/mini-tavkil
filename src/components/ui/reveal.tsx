'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Reveal-on-scroll wrapper. Adds `.in` once the element scrolls into view, which
// triggers the CSS transition defined in globals.css. With `stagger`, direct
// children animate in sequence.
//
// SEO-safe: children are server-rendered into the HTML; the hidden start-state
// lives behind `@media (scripting: enabled)`, so non-JS agents see them visible.
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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
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
