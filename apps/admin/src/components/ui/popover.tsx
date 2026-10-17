import { type ComponentProps } from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

// Reusable popover on Base UI's Popover primitive — a panel for richer content
// (e.g. a column-filter input), matching the admin popover surface.
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> & {
  sideOffset?: number;
  align?: ComponentProps<typeof PopoverPrimitive.Positioner>['align'];
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} align={align} className="z-50">
        <PopoverPrimitive.Popup
          className={cn(
            'border-border bg-popover text-popover-foreground rounded-lg border shadow-md outline-none',
            'origin-(--transform-origin) transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
