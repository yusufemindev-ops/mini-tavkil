import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KpiTone = 'up' | 'down' | 'warn' | 'muted';

const toneClass: Record<KpiTone, string> = {
  up: 'text-success',
  down: 'text-destructive',
  warn: 'text-warning',
  muted: 'text-muted-foreground',
};

// Prototype `.kpi-card` — uppercase label, big value, optional toned delta line.
export function KpiCard({
  label,
  value,
  delta,
  tone = 'muted',
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: KpiTone;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-[0.7rem] font-semibold uppercase tracking-wide">
        {label}
      </div>
      <div className="text-foreground mt-1.5 text-[1.6rem] font-bold leading-none">{value}</div>
      {delta && <div className={cn('mt-1.5 text-[0.72rem]', toneClass[tone])}>{delta}</div>}
    </div>
  );
}
