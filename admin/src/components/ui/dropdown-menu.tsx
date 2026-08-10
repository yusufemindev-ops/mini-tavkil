import { type ComponentProps } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

// Dropdown menu on Base UI's Menu primitive (prototype `.user-dropdown`). Items
// can render as a router link via the `render` prop:
//   <DropdownMenuItem render={<Link to="/profile" />}>Profile</DropdownMenuItem>
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
            'border-border bg-popover text-popover-foreground min-w-[240px] overflow-hidden rounded-lg border p-1.5 shadow-md',
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
        'data-[highlighted]:bg-muted data-[highlighted]:text-foreground flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium outline-none',
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
      className={cn('bg-border -mx-1.5 my-1.5 h-px', className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-2.5 py-2', className)} {...props} />;
}
