import { type ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Prototype `.badge` — small status/label pill.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold leading-relaxed [&_svg]:size-2.5',
  {
    variants: {
      variant: {
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        secondary: 'bg-muted text-muted-foreground',
        primary: 'bg-primary-soft text-primary',
        accent: 'bg-accent-soft text-accent',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
