import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.field`: block label above a control, with optional inline action
// (e.g. a "Forgot?" link) on the same row as the label.
export function Field({
  label,
  htmlFor,
  action,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  action?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mb-3.5', className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-foreground text-[0.82rem] font-semibold">
          {label}
        </label>
        {action ? <span className="text-primary-ink text-[0.8rem]">{action}</span> : null}
      </div>
      {children}
      {error ? <p className="text-destructive mt-1.5 text-[0.8rem]">{error}</p> : null}
    </div>
  );
}

// Prototype `.checkrow`: checkbox + label inline, orange accent.
export function CheckboxRow({
  label,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label
      className={cn('text-foreground-soft flex items-center gap-2.5 text-[0.88rem]', className)}
    >
      <input type="checkbox" className="accent-primary size-4" {...props} />
      {label}
    </label>
  );
}
