import { cn } from '@/lib/utils';

export interface LocaleTab {
  code: string;
  label: string;
  /** Shows a red dot — locale content fails the publish gate. */
  invalid?: boolean;
}

// Prototype `.locale-tabs` — per-locale content tab bar (EN / TR / AR) with an
// invalid dot. Controlled: parent owns the active locale.
export function LocaleTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: LocaleTab[];
  value: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('border-border mb-4 flex gap-1 border-b', className)}>
      {tabs.map((tab) => {
        const active = tab.code === value;
        return (
          <button
            key={tab.code}
            type="button"
            onClick={() => onChange(tab.code)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
            {tab.invalid && <span className="bg-destructive inline-block size-1.5 rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
