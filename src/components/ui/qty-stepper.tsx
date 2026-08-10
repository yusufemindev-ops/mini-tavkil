'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Prototype `.qty` — −/value/+ stepper used on product detail & cart rows.
export function QtyStepper({
  value,
  onChange,
  min = 1,
  step = 1,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  step?: number;
  className?: string;
}) {
  const clamp = (n: number) => (Number.isNaN(n) ? min : Math.max(min, n));

  return (
    <div
      className={cn(
        'border-border bg-card inline-flex items-center overflow-hidden rounded-sm border',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(clamp(value - step))}
        className="text-foreground-soft hover:bg-background-2 hover:text-primary grid h-[42px] w-[38px] place-items-center transition-colors"
      >
        <Minus className="size-4" />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)))}
        className="border-border text-foreground h-[42px] w-[52px] border-x bg-transparent text-center font-mono outline-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(clamp(value + step))}
        className="text-foreground-soft hover:bg-background-2 hover:text-primary grid h-[42px] w-[38px] place-items-center transition-colors"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
