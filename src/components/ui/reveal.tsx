'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reveal-on-scroll wrapper. Adds `.in` once the element scrolls into view, which
 * triggers the CSS transition defined in globals.css. With `stagger`, direct
 * children animate in sequence.
 *
 * SEO-safe: children are server-rendered into the HTML, and the hidden start
 * state lives behind `@media (scripting: enabled)`, so a non-JS crawler (or a
 * raw-HTML LLM fetch) sees them visible.
 *
 * The `top < 0` branch fixes a bug inherited from Tavkil. An IntersectionObserver
 * only reports *changes*, so jumping past an element — an in-page anchor, End,
 * a fast flick, or a restored scroll position on reload — can mean it is never
 * once intersecting. With `once: true` it then stays at `opacity: 0` forever and
 * the content is permanently invisible. Anything already above the viewport
 * counts as revealed.
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
