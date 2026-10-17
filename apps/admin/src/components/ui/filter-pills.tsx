import { cn } from '@/lib/utils';

export interface FilterPill {
  value: string;
  label: string;
  count?: number;
}

// Prototype `.filter-bar` / `.filter-pill` — single-select pill row.
export function FilterPills({
  pills,
  value,
  onChange,
  className,
}: {
  pills: FilterPill[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>
      {pills.map((pill) => {
        const active = pill.value === value;
        return (
          <button
            key={pill.value}
            type="button"
            onClick={() => onChange(pill.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
              active
                ? 'bg-primary border-primary text-white'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            {pill.label}
            {pill.count != null && (
              <span className={active ? 'opacity-100' : 'opacity-60'}>{pill.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
