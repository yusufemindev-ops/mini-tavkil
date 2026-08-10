import type { ReactNode } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { CatalogStatusBadge } from '@/components/ui/catalog-status-badge';
import { LOCALES, parseLocale, parseTheme, type LocaleCode, type Theme } from './shared';

export interface PreviewContext {
  locale: LocaleCode;
  theme: Theme;
}

// Top bar: Tavkil + PREVIEW badge, EN/TR/AR toggle, light/dark toggle, and a
// Back link whose target each page supplies.
function PreviewBar({
  locale,
  onLocale,
  theme,
  onTheme,
  backTo,
  backLabel,
  status,
}: {
  locale: LocaleCode;
  onLocale: (l: LocaleCode) => void;
  theme: Theme;
  onTheme: () => void;
  backTo: string;
  backLabel: string;
  status?: string;
}) {
  return (
    <header className="border-border bg-card sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-14 max-w-[var(--width-container,1200px)] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-2.5">
          <span className="text-foreground text-lg font-bold tracking-tight">Tavkil</span>
          <span className="bg-primary-soft text-primary rounded px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide">
            Preview
          </span>
          {status && <CatalogStatusBadge status={status} />}
        </div>

        <div className="flex items-center gap-2">
          {/* Language segmented control */}
          <div className="border-border bg-background inline-flex rounded-md border p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLocale(l)}
                aria-pressed={locale === l}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors',
                  locale === l
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="border-border bg-background text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md border transition-colors"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link
            to={backTo}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {backLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

// Root wrapper for both preview pages: applies dir + dark class, persists the
// locale/theme choice in the URL query so it survives grid → detail navigation,
// and hands the resolved locale/theme to its render-prop children.
export function PreviewChrome({
  backTo,
  backLabel,
  status,
  children,
}: {
  backTo: string;
  backLabel: string;
  status?: string;
  children: (ctx: PreviewContext) => ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = parseLocale(searchParams.get('locale'));
  const theme = parseTheme(searchParams.get('theme'));

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={cn(theme === 'dark' && 'dark', 'bg-background text-foreground min-h-screen')}
    >
      <PreviewBar
        locale={locale}
        onLocale={(l) => setParam('locale', l)}
        theme={theme}
        onTheme={() => setParam('theme', theme === 'dark' ? 'light' : 'dark')}
        backTo={backTo}
        backLabel={backLabel}
        status={status}
      />
      {children({ locale, theme })}
    </div>
  );
}
