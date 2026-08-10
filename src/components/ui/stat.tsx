import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.stat` — big mono number with a muted label beneath.
export function Stat({
  value,
  label,
  className,
}: {
  value: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('text-center', className)}>
      <div className="text-primary font-mono text-[2.1rem] font-semibold tracking-tight">
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-[0.84rem]">{label}</div>
    </div>
  );
}
