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
            // inline-block + py-1 gives a 24px hit area (WCAG 2.2, 2.5.8); at the
            // inherited line-height alone these measured 20px.
            <Link href={item.href} className="hover:text-primary-ink inline-block py-1">
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
