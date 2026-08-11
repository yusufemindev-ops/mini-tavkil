import { Fragment, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

export interface Crumb {
  label: string;
  href?: string;
}

// Prototype `.crumb` — slash-separated trail; last item is the current page.
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-3.5 flex flex-wrap items-center gap-2 text-[0.82rem]"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        let node: ReactNode;
        if (last || !item.href) {
          node = <span className={last ? 'text-foreground-soft' : undefined}>{item.label}</span>;
        } else {
          node = (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          );
        }
        return (
          <Fragment key={`${item.label}-${i}`}>
            {node}
            {!last && (
              <span aria-hidden className="text-muted-foreground">
                /
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
