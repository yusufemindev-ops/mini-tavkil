'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';

interface CountUpProps {
  /** Target value, e.g. 340. */
  value: number;
  suffix?: string;
  durationMs?: number;
}

// Animates from 0 → value once the element scrolls into view. Respects
// prefers-reduced-motion by rendering the final value immediately.
export function CountUp({ value, suffix = '', durationMs = 1100 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Reduced motion renders the final value directly (see `shown` below).
    if (reduced) return;
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let start = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const tick = (now: number) => {
          if (!start) start = now;
          const progress = Math.min((now - start) / durationMs, 1);
          // cubic ease-out
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs, reduced]);

  const shown = reduced ? value : display;
  return (
    <span ref={ref} className="font-mono">
      {shown.toLocaleString()}
      {suffix}
    </span>
  );
}
