import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.table` — styles th/td/tr via child selectors so screens write
// plain <thead>/<tbody>/<tr>/<th>/<td>. Wrap in horizontal scroll for small
// screens. Add `cursor-pointer` + onClick on a <tr> for clickable rows.
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-[13px]',
          '[&_th]:border-border [&_th]:bg-muted/40 [&_th]:text-muted-foreground [&_th]:border-b [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-start [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide',
          '[&_td]:border-border [&_td]:border-b [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle',
          '[&_tbody_tr:hover]:bg-muted/30 [&_tbody_tr:last-child_td]:border-b-0',
          className,
        )}
        {...props}
      />
    </div>
  );
}
