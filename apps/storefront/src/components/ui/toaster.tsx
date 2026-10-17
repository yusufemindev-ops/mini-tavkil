'use client';

import { type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { cn } from '@/lib/utils';

function IconChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('grid size-6 flex-none place-items-center rounded-md', className)}>
      {children}
    </span>
  );
}

// Brand-styled toasts: card surface with a subtle per-type tint and a colored
// left accent, our colored status icons, our radius/font, and following the app
// theme (next-themes) so they match the toggle in light and dark.
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="top-center"
      gap={10}
      icons={{
        success: (
          <IconChip className="bg-ok/20 text-ok">
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
          <IconChip className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
          </IconChip>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-s-4 bg-card font-sans shadow-card !gap-3.5',
          title: 'text-sm font-semibold',
          description: 'text-muted-foreground',
          actionButton: 'rounded-sm bg-primary-button text-primary-button-foreground',
          cancelButton: 'rounded-sm bg-muted text-muted-foreground',
          closeButton: 'border-border bg-card text-muted-foreground hover:text-foreground',
          // Stronger per-state color: tinted surface, colored accent + title.
          success: 'border-ok/30 border-s-ok bg-ok/[0.12] [&_[data-title]]:text-ok',
          error:
            'border-destructive/30 border-s-destructive bg-destructive/[0.12] [&_[data-title]]:text-destructive',
          info: 'border-primary/30 border-s-primary bg-primary/[0.1] [&_[data-title]]:text-primary-ink',
          warning:
            'border-amber-500/30 border-s-amber-500 bg-amber-500/[0.12] [&_[data-title]]:text-amber-700 dark:[&_[data-title]]:text-amber-400',
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
