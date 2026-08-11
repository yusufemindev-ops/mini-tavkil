import { CategoryIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface CategoryRailItem {
  /** Stable key. */
  id: string;
  label: string;
  href: string;
  /** Category image; fills the icon pill when set. */
  imageUrl?: string | null;
  /** Slug, used to pick the brand category icon when there is no image. */
  slug?: string;
  active?: boolean;
}

// Prototype `.dir-rail` — a carded, sticky category navigation rail with icon
// pills. Items can point to in-page anchors (#cat-<id>) or to routes.
//
// The pill and the icons inside it are Tavkil's — `components/icons.tsx` is that
// package ported verbatim. Only the *lookup* differs: Tavkil switched on a fixed
// six-value CategoryId enum, and categories are database rows here, so
// `categoryIconFor()` matches on the slug and name instead. An uploaded category
// image still wins over the icon.
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
              <CategoryPill
                imageUrl={item.imageUrl}
                hint={`${item.slug ?? ''} ${item.label}`}
                active={item.active}
              />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shared with the mobile dropdown so both navigations look the same. */
export function CategoryPill({
  imageUrl,
  hint,
  active,
}: {
  imageUrl?: string | null;
  hint?: string;
  active?: boolean;
}) {
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
        <CategoryIcon hint={hint} className="size-[17px]" />
      )}
    </span>
  );
}
