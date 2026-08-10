import { cn } from '@/lib/utils';

export interface CategoryRailItem {
  /** Stable key. */
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

// Prototype `.dir-rail` — a carded, sticky category navigation rail. Items can
// point to in-page anchors (#cat-<id>) or to routes.
//
// Tavkil rendered a per-category icon from a fixed six-value enum. Categories are
// database rows here, so there is no enum to key off — the rail is text only.
export function CategoryRail({
  title,
  items,
  className,
}: {
  title: string;
  items: CategoryRailItem[];
  className?: string;
}) {
  return (
    <nav
      className={cn('border-border bg-card rounded-lg border p-3.5', className)}
      aria-label={title}
    >
      <p className="text-muted-foreground mb-2 px-1 text-[0.72rem] font-bold uppercase tracking-wide">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className={cn(
                // leading-snug tightens the wrap when a longer category name
                // spills onto a second line.
                'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.92rem] font-medium leading-snug transition-colors',
                item.active
                  ? 'bg-background-2 text-foreground'
                  : 'text-foreground-soft hover:bg-background-2 hover:text-foreground',
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
