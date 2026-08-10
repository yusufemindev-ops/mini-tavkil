import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.card` family — bordered surface with an optional titled head and a
// padded (or tight) body. Distinct from the shadcn `Card` (which uses p-6); this
// matches the admin v2 card-head/card-body rhythm used across screens.
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('border-border bg-card overflow-hidden rounded-lg border', className)}
      {...props}
    />
  );
}

export function PanelHead({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border flex items-center justify-between gap-4 border-b px-[18px] py-3.5',
        className,
      )}
    >
      <h3 className="text-foreground text-[0.95rem] font-semibold">{title}</h3>
      {action}
    </div>
  );
}

export function PanelBody({
  className,
  tight,
  ...props
}: ComponentProps<'div'> & { tight?: boolean }) {
  return <div className={cn(tight ? 'p-0' : 'p-[18px]', className)} {...props} />;
}
