import { useTranslations } from 'next-intl';

/**
 * "Skip to content" — the first thing in the tab order.
 *
 * The storefront header is a logo, four nav links, a locale switcher, a theme
 * toggle and a CTA. Without this, a keyboard or screen-reader user tabs through
 * all of it on every page before reaching the content. WCAG 2.4.1 asks for it and
 * we had none.
 *
 * Visually hidden until focused rather than always shown, which is the
 * conventional treatment: `sr-only` plus `focus:not-sr-only` so it appears in
 * place when it matters and takes no layout otherwise.
 */
export function SkipLink() {
  const t = useTranslations('store');
  return (
    <a
      href="#main"
      className="bg-primary text-primary-foreground focus-visible:ring-ring/50 sr-only rounded-sm px-4 py-2 text-sm font-semibold focus-visible:not-sr-only focus-visible:absolute focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:ring-3"
    >
      {t('skip_to_content')}
    </a>
  );
}
