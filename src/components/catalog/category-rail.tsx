import { CategoryIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface CategoryRailItem {
  /** Stable key. */
  id: string;
  label: string;
  href: string;
  /** Slug; combined with the label to pick the brand category icon. */
  slug?: string;
  active?: boolean;
}

/** Sticky category navigation rail with icon pills linking to anchor IDs or routes. */
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
      <p className="text-muted-foreground mb-2 px-1 text-[0.72rem] font-bold tracking-wide uppercase">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.92rem] leading-snug font-medium transition-colors',
                item.active
                  ? 'bg-background-2 text-foreground'
                  : 'text-foreground-soft hover:bg-background-2 hover:text-foreground',
              )}
            >
              <CategoryPill hint={`${item.slug ?? ''} ${item.label}`} active={item.active} />
              <span dir="auto">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Category icon pill indicator shared between desktop rail and mobile navigation. */
export function CategoryPill({ hint, active }: { hint?: string; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[30px] flex-none place-items-center overflow-hidden rounded-lg transition-colors',
        active
          ? 'bg-primary-button text-primary-button-foreground'
          : 'bg-primary-soft text-primary-ink group-hover:bg-primary group-hover:text-primary-foreground',
      )}
    >
      <CategoryIcon hint={hint} className="size-[17px]" />
    </span>
  );
}
