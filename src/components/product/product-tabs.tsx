'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Accessible tab switcher (roving tabindex + Arrow/Home/End navigation) over server-rendered panels.
 */
export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const baseId = useId();
  const [active, setActive] = useState(tabs[0]?.id);

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    setActive(target.id);
    document.getElementById(tabId(target.id))?.focus();
  }

  return (
    <div>
      <div role="tablist" className="border-border flex gap-1 border-b" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId(tab.id)}
              // Roving tabindex: Tab reaches the tablist once, then arrows move
              // within it — the APG pattern.
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
                isActive
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={panelId(tab.id)}
          role="tabpanel"
          aria-labelledby={tabId(tab.id)}
          hidden={tab.id !== active}
          tabIndex={0}
          className="focus-visible:ring-ring/50 pt-6 outline-none focus-visible:ring-3"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
