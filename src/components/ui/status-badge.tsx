import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Prototype `.ord-badge` — pill with a leading status dot.
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-[11px] py-1 text-[0.76rem] font-semibold before:size-[7px] before:rounded-full',
  {
    variants: {
      status: {
        // In progress — awaiting our pricing.
        submitted: 'bg-primary-soft text-primary-ink before:bg-primary',
        // Action needed — buyer must accept or reject the confirmed pricing.
        confirmed: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 before:bg-amber-500',
        // Terminal: positive.
        accepted: 'bg-ok/15 text-ok before:bg-ok',
        // Terminal: buyer declined.
        rejected: 'bg-destructive/12 text-destructive before:bg-destructive',
        // Terminal: auto-expired.
        expired: 'bg-background-2 text-muted-foreground before:bg-muted-foreground',
      },
    },
    defaultVariants: { status: 'submitted' },
  },
);

export function StatusBadge({
  status,
  className,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: React.ReactNode }) {
  return <span className={cn(badgeVariants({ status }), className)}>{children}</span>;
}
