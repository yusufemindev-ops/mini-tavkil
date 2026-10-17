import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Table } from '@/components/ui/table';

// Base pulsing placeholder. Compose the shaped helpers below to mirror the real
// content rather than dropping identical grey bars everywhere.
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />;
}

// Deterministic, varied bar widths so a column of text doesn't read as one solid
// block. Seeded (no Math.random) → stable across renders.
const WIDTHS = ['72%', '54%', '64%', '46%', '60%', '50%', '68%', '58%'];
const widthFor = (seed: number) => WIDTHS[((seed % WIDTHS.length) + WIDTHS.length) % WIDTHS.length];

// ===== Lists / tables =======================================================

export type SkeletonCell =
  | 'text' // a single varied-width line
  | 'code' // short monospace-ish token (SKU, ref)
  | 'number' // short right-ish numeric value
  | 'badge' // one status pill
  | 'badges' // a row of small locale pills
  | 'avatar' // thumbnail + two stacked lines (name + subtitle)
  | 'actions'; // trailing action buttons

export interface SkeletonColumn {
  /** Real column header, so the loading table keeps its header row. */
  header?: string;
  cell?: SkeletonCell;
  className?: string;
}

function CellSkeleton({ kind, seed }: { kind: SkeletonCell; seed: number }) {
  switch (kind) {
    case 'avatar':
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 flex-none rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3" style={{ width: widthFor(seed) }} />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      );
    case 'code':
      return <Skeleton className="h-3 w-20 rounded" />;
    case 'number':
      return <Skeleton className="h-3 w-10" />;
    case 'badge':
      return <Skeleton className="h-5 w-16 rounded-full" />;
    case 'badges':
      return (
        <div className="flex gap-1">
          <Skeleton className="h-5 w-7 rounded-full" />
          <Skeleton className="h-5 w-7 rounded-full" />
          <Skeleton className="h-5 w-7 rounded-full" />
        </div>
      );
    case 'actions':
      return (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
      );
    case 'text':
    default:
      return <Skeleton className="h-3" style={{ width: widthFor(seed) }} />;
  }
}

// Loading state for any list page: the real <Table> header row + N rows whose
// cells are shaped per column (avatar, badge, code…). Pass the page's actual
// columns so the skeleton lines up with the table it replaces.
export function TableSkeleton({
  columns,
  rows = 8,
  bordered = false,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  // Wrap in the same rounded border container as <DataTable>. Use on pages whose
  // loaded state is a DataTable (so loading and loaded match). Leave off when the
  // skeleton already sits inside a <Panel>.
  bordered?: boolean;
}) {
  const table = (
    <Table>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} className={c.className}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {columns.map((c, i) => (
              <td key={i} className={c.className}>
                <CellSkeleton kind={c.cell ?? 'text'} seed={r * 7 + i * 3} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );

  if (!bordered) return table;

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">{table}</div>
    </div>
  );
}

// Back-compat simple stack of full-width bars. Prefer a shaped helper above.
export function SkeletonRows({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5 p-1', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ===== Cards ================================================================

// Matches KpiCard: label, big value, delta line.
export function KpiCardSkeleton() {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-2.5 h-7 w-14" />
      <Skeleton className="mt-2.5 h-2.5 w-28" />
    </div>
  );
}

// Generic content card (title, two lines, a row of chips). `count` cards inside
// the caller's own grid wrapper (pass the same grid classes via `className`).
export function CardGridSkeleton({
  count = 6,
  className,
  chips = 3,
}: {
  count?: number;
  className?: string;
  chips?: number;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-border bg-card rounded-lg border p-[18px]">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 flex-none rounded-md" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: chips }).map((_, j) => (
              <Skeleton key={j} className="h-7 w-24 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Detail / edit forms ==================================================

// A label + control pair, matching <Field><FieldLabel/><Input/></Field>.
export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

// A bordered panel with a header bar and a grid of field skeletons — the shape
// of the catalog/buyer/supplier edit panels.
export function FormPanelSkeleton({ fields = 4, cols = 2 }: { fields?: number; cols?: 1 | 2 }) {
  return (
    <div className="border-border bg-card rounded-lg border">
      <div className="border-border flex items-center border-b px-[18px] py-3.5">
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="p-[18px]">
        <div className={cn('grid gap-3.5', cols === 2 && 'sm:grid-cols-2')}>
          {Array.from({ length: fields }).map((_, i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Page title + subtitle + trailing action buttons, matching <PageHeader>.
export function PageHeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>
    </div>
  );
}

// Full edit-page loading state: header + a two-column body of form panels,
// mirroring the TwoCol catalog/buyer/supplier editors.
export function EditPageSkeleton({ actions = 3 }: { actions?: number }) {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeaderSkeleton actions={actions} />
      <div className="grid gap-[18px] lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-[18px]">
          <FormPanelSkeleton fields={4} />
          <FormPanelSkeleton fields={6} />
        </div>
        <div className="flex flex-col gap-[18px]">
          <FormPanelSkeleton fields={3} cols={1} />
          <FormPanelSkeleton fields={2} cols={1} />
        </div>
      </div>
    </div>
  );
}

// ===== Activity feed ========================================================

// Icon bubble + two text lines per row — matches the dashboard activity list.
export function ActivitySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-3 px-[18px] py-3.5',
            i > 0 && 'border-border border-t',
          )}
        >
          <Skeleton className="size-8 flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3" style={{ width: widthFor(i) }} />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
