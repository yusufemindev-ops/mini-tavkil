'use client';

import { type ComponentProps } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

// Reusable dropdown menu on Base UI's Menu primitive, styled to match our
// popover surface (see select.tsx). Items can render as a link via the Base UI
// `render` prop: <DropdownMenuItem render={<Link href="…" />}>…</DropdownMenuItem>.
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = 'end',
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> & {
  sideOffset?: number;
  align?: ComponentProps<typeof MenuPrimitive.Positioner>['align'];
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={sideOffset} align={align} className="z-50">
        <MenuPrimitive.Popup
          className={cn(
            'border-border bg-popover text-popover-foreground shadow-card min-w-52 overflow-hidden rounded-lg border p-1.5',
            'origin-(--transform-origin) transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        // Translucent foreground tint works in both themes (in dark, the neutral
        // surface tokens equal the popover bg, so a solid token shows nothing).
        'relative flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none transition-colors',
        'data-[highlighted]:bg-foreground/[0.07] active:bg-foreground/[0.13]',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn('bg-border-2 -mx-1.5 my-1.5 h-px', className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-2.5 py-1.5', className)} {...props} />;
}
