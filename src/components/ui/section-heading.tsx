import { type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

// Prototype `.kicker` — uppercase label with a short leading accent bar.
export function Kicker({
  children,
  className,
  tone = 'primary',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'primary' | 'onDark';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-wider',
        // 0.78rem is normal-size text, so it needs 4.5:1. The brand orange is a
        // fill colour — it measures 3.18:1 on white and 2.94:1 on the tinted
        // section background. --primary-ink is the text-safe shade of the same
        // orange (4.79:1 / 4.43:1) and is what Tavkil defines the token for.
        tone === 'onDark' ? 'text-white' : 'text-primary-ink',
        'before:h-0.5 before:w-[18px] before:rounded-full before:content-[""]',
        tone === 'onDark' ? 'before:bg-white' : 'before:bg-primary',
        className,
      )}
    >
      {children}
    </span>
  );
}

// Prototype `.sec-head` — kicker + heading on the left, optional "View all"
// link aligned to the right (bottom-aligned).
export function SectionHeading({
  kicker,
  title,
  viewAll,
  className,
}: {
  kicker: string;
  title: string;
  viewAll?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn('mb-[30px] flex flex-wrap items-end justify-between gap-5', className)}>
      <div className="max-w-2xl">
        <Kicker>{kicker}</Kicker>
        <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {viewAll && (
        <Link
          href={viewAll.href}
          className="text-primary-ink group inline-flex items-center gap-1.5 py-1 text-[0.92rem] font-semibold"
        >
          {viewAll.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
