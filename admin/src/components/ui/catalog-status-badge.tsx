import { Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Catalog lifecycle status (products + categories): draft / published / archived.
// Distinct from the order-status StatusBadge in ./status-badge.

// Human label for a catalog status code.
function statusLabel(status: string): string {
  if (status === 'published') return 'Published';
  if (status === 'archived') return 'Archived';
  return 'Draft';
}

// Draft / Published / Archived pill — shared by the product list, the editor
// header, and the preview bar so status styling stays consistent everywhere.
export function CatalogStatusBadge({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <Badge variant="success" className="justify-self-start">
        <Check className="size-2.5" strokeWidth={3} />
        Published
      </Badge>
    );
  }
  if (status === 'archived')
    return (
      <Badge variant="secondary" className="justify-self-start">
        Archived
      </Badge>
    );
  return (
    <Badge variant="warning" className="justify-self-start">
      <Clock className="size-2.5" />
      Draft
    </Badge>
  );
}

// A tiny coloured dot for compact spots (e.g. a select option) where a full
// badge would be too heavy. Same colour language as CatalogStatusBadge.
export function CatalogStatusDot({ status, className }: { status: string; className?: string }) {
  const color =
    status === 'published'
      ? 'bg-emerald-500'
      : status === 'archived'
        ? 'bg-muted-foreground'
        : 'bg-amber-500';
  return (
    <span
      title={statusLabel(status)}
      aria-label={statusLabel(status)}
      className={cn('inline-block size-2 flex-none rounded-full', color, className)}
    />
  );
}
