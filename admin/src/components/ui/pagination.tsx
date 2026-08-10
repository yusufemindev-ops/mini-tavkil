import { cn } from '@/lib/utils';

/**
 * Page numbers to render, with `'…'` gaps. Always keeps the first and last page
 * plus a window around the current page. Pure + exported for testing.
 */
export function getPageWindow(page: number, pageCount: number, window = 1): (number | '…')[] {
  const pages: (number | '…')[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || (n >= page - window && n <= page + window)) pages.push(n);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return pages;
}

// Prototype `.pager` — "showing X–Y of N" + windowed page buttons.
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = getPageWindow(page, pageCount);

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-1.5 pb-1 pt-3.5 text-[13px]">
      <span>
        Showing <strong className="text-foreground font-semibold">{from}</strong>–
        <strong className="text-foreground font-semibold">{to}</strong> of{' '}
        <strong className="text-foreground font-semibold">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <PagerButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </PagerButton>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="text-muted-foreground px-1">
              …
            </span>
          ) : (
            <PagerButton key={p} active={p === page} onClick={() => onPage(p)}>
              {p}
            </PagerButton>
          ),
        )}
        <PagerButton disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          ›
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'border-border inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[12.5px] transition-colors',
        active
          ? 'bg-primary border-primary text-white'
          : 'bg-card text-foreground hover:border-primary hover:text-primary',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  );
}
