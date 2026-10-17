'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CategoryPill, type CategoryRailItem } from '@/components/catalog/category-rail';

// Mobile/tablet counterpart of the CategoryRail: a full-width dropdown that jumps
// to the in-page category sections (same anchor links). Shown below lg where the
// sticky rail is hidden.
export function CategoryMenuMobile({
  title,
  items,
  className,
}: {
  title: string;
  items: CategoryRailItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="border-border bg-card data-[popup-open]:border-primary flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-start transition-colors">
          <span className="text-foreground text-sm font-semibold">{title}</span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              open && 'rotate-180',
            )}
          />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[var(--anchor-width)] p-1.5">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-foreground-soft hover:bg-background-2 hover:text-foreground group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.92rem] font-medium transition-colors"
                >
                  <CategoryPill hint={`${item.slug ?? ''} ${item.label}`} />
                  <span dir="auto">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
