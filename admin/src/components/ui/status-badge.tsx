import { cn } from '@/lib/utils';

// Order lifecycle statuses (db-schema.md §order_requests).
export type OrderStatus = 'submitted' | 'confirmed' | 'accepted' | 'rejected' | 'expired';

const STATUS: Record<OrderStatus, { cls: string; label: string }> = {
  submitted: { cls: 'bg-muted text-muted-foreground', label: 'Submitted' },
  confirmed: { cls: 'bg-warning-soft text-warning', label: 'Confirmed' },
  accepted: { cls: 'bg-success-soft text-success', label: 'Accepted' },
  rejected: { cls: 'bg-destructive/10 text-destructive', label: 'Rejected' },
  expired: { cls: 'bg-muted text-muted-foreground', label: 'Expired' },
};

// Prototype `.status-pill` — order-status pill with a fixed label.
export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-[3px] text-[11px] font-semibold',
        s.cls,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
