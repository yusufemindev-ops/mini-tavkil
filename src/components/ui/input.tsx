import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Prototype `.input`: subtle border, orange focus ring (primary-soft glow).
const inputClass =
  'w-full rounded-sm border border-input bg-background px-[13px] py-[11px] text-base sm:text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export { inputClass };
