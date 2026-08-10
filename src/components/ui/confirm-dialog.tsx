'use client';

import { type ReactElement, type ReactNode } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Reusable confirmation modal on Base UI's AlertDialog (focus-trapped, no
// accidental light-dismiss). Pass any button as `trigger`; `onConfirm` runs when
// the user confirms, and the dialog closes on either choice. Use for
// destructive or irreversible actions (delete, cancel order, …).
//
// <ConfirmDialog
//   trigger={<Button variant="destructive">Delete</Button>}
//   title="Delete this item?"
//   description="This cannot be undone."
//   confirmLabel="Delete"
//   destructive
//   onConfirm={() => mutation.mutate()}
// />
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: {
  /** The button (or element) that opens the dialog. Omit when controlling `open`. */
  trigger?: ReactElement;
  /** Controlled open state — use when opening the dialog programmatically (e.g. after form validation). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialog.Trigger render={trigger} />}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]',
            'transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
          )}
        />
        <AlertDialog.Popup
          className={cn(
            'border-border bg-card text-foreground fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-lg outline-none',
            'transition-[transform,opacity] data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
          )}
        >
          <AlertDialog.Title className="text-foreground text-base font-semibold">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="text-muted-foreground mt-1 text-sm">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
              {cancelLabel}
            </AlertDialog.Close>
            <AlertDialog.Close
              render={<Button variant={destructive ? 'destructive' : 'default'} size="sm" />}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
