import { type ReactNode } from 'react';

// Prototype `.page-head` — title + subtitle on the left, actions on the right.
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {/* break-words so a long, space-less name/SKU wraps instead of blowing
            out the layout (min-w-0 lets the flex child actually shrink). */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-foreground break-words text-2xl font-bold tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-muted-foreground mt-1 break-words text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
