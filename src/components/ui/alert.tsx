import { type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Inline alert / note box (prototype `.cat-note` / `.rq-note`). Soft tinted
// background with a leading icon. Used for the pricing note, form notes, etc.
const alertVariants = cva('flex items-start gap-2.5 rounded-sm px-3.5 py-2.5 text-[0.85rem]', {
  variants: {
    variant: {
      info: 'bg-primary-soft text-primary-ink',
      success: 'bg-ok/15 text-ok',
      warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      danger: 'bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

const DEFAULT_ICON: Record<string, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export function Alert({
  variant = 'info',
  icon,
  className,
  children,
}: VariantProps<typeof alertVariants> & {
  /** Override the default per-variant icon, or pass null to hide it. */
  icon?: ReactNode | null;
  className?: string;
  children: ReactNode;
}) {
  const Icon = DEFAULT_ICON[variant ?? 'info'];
  return (
    <div role="status" className={cn(alertVariants({ variant }), className)}>
      {icon === null ? null : (icon ?? <Icon className="mt-px size-4 flex-none" />)}
      <span>{children}</span>
    </div>
  );
}
