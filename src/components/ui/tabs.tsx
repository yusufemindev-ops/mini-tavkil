'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-6', className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        'border-border bg-background-2 flex gap-1 overflow-x-auto rounded-lg border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        'text-muted-foreground shrink-0 cursor-pointer whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium outline-none transition-colors',
        'hover:text-foreground focus-visible:ring-primary/40 focus-visible:ring-2',
        'data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn('outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTab, TabsPanel };
