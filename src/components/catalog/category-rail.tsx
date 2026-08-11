import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryRailItem {
  /** Stable key. */
  id: string;
  label: string;
  href: string;
  /** Category image; fills the icon pill when set. */
  imageUrl?: string | null;
  active?: boolean;
}

// Prototype `.dir-rail` — a carded, sticky category navigation rail with icon
// pills. Items can point to in-page anchors (#cat-<id>) or to routes.
//
// The pill is Tavkil's, unchanged. What fills it isn't: Tavkil keyed a hand-drawn
// icon off a fixed six-value CategoryId enum, and categories are database rows
// here — a row named "Hydraulic seals" has no enum member to look up. So the pill
// shows the category's own uploaded image, and falls back to a single neutral
// glyph rather than guessing an icon from the name.
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
              <CategoryPill imageUrl={item.imageUrl} active={item.active} />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shared with the mobile dropdown so both navigations look the same. */
export function CategoryPill({ imageUrl, active }: { imageUrl?: string | null; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[30px] flex-none place-items-center overflow-hidden rounded-lg transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-primary-soft text-primary-ink group-hover:bg-primary group-hover:text-primary-foreground',
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <Package className="size-[17px]" />
      )}
    </span>
  );
}
