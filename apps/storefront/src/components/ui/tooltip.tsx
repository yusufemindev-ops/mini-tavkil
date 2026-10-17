'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Lightweight hover/focus tooltip on Base UI. Wraps a single interactive child
// (a button/link) as its trigger — the child stays the real element, so
// accessibility (aria-label) and click behaviour are unchanged. Content is
// passed already-translated by the caller, so it's multilingual + RTL-safe.
export function Tooltip({
  content,
  children,
  side = 'bottom',
}: {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <TooltipPrimitive.Provider delay={100} closeDelay={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                'bg-foreground text-background rounded-md px-2.5 py-1 text-xs font-medium shadow-md',
                'origin-(--transform-origin) transition-[transform,opacity]',
                'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
