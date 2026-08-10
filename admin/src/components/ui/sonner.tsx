import { type ReactNode, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { cn } from '@/lib/utils';

// The admin toggles the `.dark` class on <html> (see theme-toggle.tsx) instead of
// using next-themes. Mirror that into sonner's `theme` prop so toasts follow the
// toggle in light and dark.
function useThemeClass(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function IconChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('grid size-6 flex-none place-items-center rounded-md', className)}>
      {children}
    </span>
  );
}

// Brand-styled toasts: card surface with a subtle per-type tint and a colored
// left accent, our colored status icons, our radius/font, and following the app
// theme so they match the toggle in light and dark.
export function Toaster(props: ToasterProps) {
  const theme = useThemeClass();

  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      gap={10}
      icons={{
        success: (
          <IconChip className="bg-success/20 text-success">
            <CheckCircle2 className="size-4" />
          </IconChip>
        ),
        error: (
          <IconChip className="bg-destructive/15 text-destructive">
            <AlertCircle className="size-4" />
          </IconChip>
        ),
        info: (
          <IconChip className="bg-primary/15 text-primary">
            <Info className="size-4" />
          </IconChip>
        ),
        warning: (
          <IconChip className="bg-warning/20 text-warning">
            <AlertTriangle className="size-4" />
          </IconChip>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-s-4 bg-card font-sans shadow-lg !gap-3.5',
          title: 'text-sm font-semibold',
          description: 'text-muted-foreground',
          actionButton: 'rounded-sm bg-primary text-primary-foreground',
          cancelButton: 'rounded-sm bg-muted text-muted-foreground',
          closeButton: 'border-border bg-card text-muted-foreground hover:text-foreground',
          // Stronger per-state color: tinted surface, colored accent + title.
          success:
            'border-success/30 border-s-success bg-success/[0.12] [&_[data-title]]:text-success',
          error:
            'border-destructive/30 border-s-destructive bg-destructive/[0.12] [&_[data-title]]:text-destructive',
          info: 'border-primary/30 border-s-primary bg-primary/[0.1] [&_[data-title]]:text-primary',
          warning:
            'border-warning/30 border-s-warning bg-warning/[0.12] [&_[data-title]]:text-warning',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-border': 'var(--border)',
          '--normal-text': 'var(--foreground)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
