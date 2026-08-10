import { type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

const TONE: Record<NotificationVariant, { icon: LucideIcon; chip: string }> = {
  info: { icon: Info, chip: 'bg-primary-soft text-primary' },
  success: { icon: CheckCircle2, chip: 'bg-ok/15 text-ok' },
  warning: { icon: AlertTriangle, chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  error: { icon: AlertCircle, chip: 'bg-destructive/10 text-destructive' },
};

// In-app notification card (also the shape used for toast content). Icon chip
// title + description, optional unread dot, action, and dismiss.
export function Notification({
  variant = 'info',
  title,
  description,
  time,
  unread = false,
  action,
  onDismiss,
  className,
}: {
  variant?: NotificationVariant;
  title: string;
  description?: string;
  time?: string;
  unread?: boolean;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { icon: Icon, chip } = TONE[variant];
  return (
    <div
      className={cn(
        'border-border bg-card shadow-card-sm flex items-start gap-3 rounded-lg border p-3.5',
        className,
      )}
    >
      <span className={cn('grid size-9 flex-none place-items-center rounded-lg', chip)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground text-sm font-semibold">{title}</p>
          {unread && <span className="bg-primary size-1.5 flex-none rounded-full" />}
          {time && (
            <span className="text-muted-foreground ms-auto font-mono text-[0.7rem]">{time}</span>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-[0.85rem] leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground -me-1 -mt-1 flex-none rounded-md p-1 transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
