import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GateLocale {
  code: string;
  label: string;
  /** All required fields for this locale are filled. */
  complete: boolean;
}

export interface GateCheck {
  label: string;
  done: boolean;
}

// Prototype `.publish-gate` — readiness panel: overall status, per-locale tabs
// with completion checks, and the active locale's checklist. Controlled by the
// parent (active locale + the derived checks/ready state).
export function PublishGate({
  ready,
  locales,
  activeLocale,
  onLocale,
  checks,
}: {
  ready: boolean;
  locales: GateLocale[];
  activeLocale: string;
  onLocale: (code: string) => void;
  checks: GateCheck[];
}) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <div className="border-border flex items-center justify-between gap-4 border-b px-[18px] py-3.5">
        <h3 className="text-foreground text-[0.95rem] font-semibold">Publish readiness</h3>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            ready ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive',
          )}
        >
          {ready ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          {ready ? 'Ready to publish' : 'Blocked'}
        </span>
      </div>

      <div className="p-[18px]">
        {/* Per-locale completion tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {locales.map((loc) => {
            const active = loc.code === activeLocale;
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => onLocale(loc.code)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active ? 'border-primary text-primary' : 'border-border text-foreground',
                )}
              >
                <span
                  className={cn(
                    'grid size-3.5 place-items-center rounded-full',
                    loc.complete ? 'bg-success text-white' : 'border-muted-foreground/40 border',
                  )}
                >
                  {loc.complete && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                {loc.label}
              </button>
            );
          })}
        </div>

        {/* Active-locale checklist */}
        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'grid size-4 flex-none place-items-center rounded-full',
                  check.done ? 'bg-success text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {check.done ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : (
                  <X className="size-2.5" strokeWidth={3} />
                )}
              </span>
              <span className={check.done ? 'text-foreground' : 'text-muted-foreground'}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
