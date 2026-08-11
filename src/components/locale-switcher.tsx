'use client';

import { useLocale, useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocalizedPaths } from '@/components/localized-paths';
import { cn } from '@/lib/utils';

const CODES: Record<string, string> = { en: 'EN', ar: 'AR', tr: 'TR' };

// Faithful port of the prototype `.locale` segmented toggle (EN · AR · TR). All
// configured locales are always offered — the storefront auto-detects the browser
// language on first visit and remembers a manual switch via cookie (next-intl
// localeDetection); there is no admin enable/disable.
export function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  // On an entity page (category/product) the slug differs per locale, so switch
  // to that locale's own path; elsewhere keep the current pathname.
  const localizedPaths = useLocalizedPaths();

  const switchTo = (code: string) =>
    router.replace(localizedPaths[code] ?? pathname, {
      locale: code as (typeof routing.locales)[number],
    });

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="border-border bg-card inline-flex h-[38px] items-center overflow-hidden rounded-[8px] border"
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => switchTo(code)}
            className={cn(
              'font-mono text-[0.7rem] font-semibold transition-colors',
              'flex h-full items-center px-[9px]',
              'border-border not-first:border-s',
              active
                ? 'bg-primary-button text-primary-button-foreground'
                : 'text-muted-foreground hover:bg-background-2 hover:text-foreground',
            )}
          >
            {CODES[code] ?? code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
