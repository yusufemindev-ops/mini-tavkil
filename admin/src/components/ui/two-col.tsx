import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.two-col` — main content + 320px right rail (stacks on small screens).
export function TwoCol({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start', className)}
      {...props}
    />
  );
}

// Prototype `.right-stack` — vertical stack for the right rail cards.
export function RightStack({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />;
}
