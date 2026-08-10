import { type ReactNode } from 'react';

// Prototype `.empty-state` — centered icon + title + description + action.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-14 text-center">
      <div className="bg-muted text-muted-foreground mx-auto mb-4 grid size-[60px] place-items-center rounded-full">
        {icon}
      </div>
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
