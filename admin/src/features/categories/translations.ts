import type { AdminTranslation } from './queries';

// The three locales the catalog ships in. Order matters for tab + badge display.
export type LocaleCode = 'en' | 'tr' | 'ar';

export const LOCALE_ORDER: LocaleCode[] = ['en', 'tr', 'ar'];

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  tr: 'Türkçe',
  ar: 'العربية',
};

export const LOCALE_SHORT: Record<LocaleCode, string> = {
  en: 'EN',
  tr: 'TR',
  ar: 'AR',
};

export const DEFAULT_LOCALE: LocaleCode = 'en';

// Editable per-locale translation form state. Empty strings (not null) so the
// inputs stay controlled; mapped back to the API payload at save time.
export interface TranslationDraft {
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export function emptyTranslation(): TranslationDraft {
  return { name: '', slug: '', description: '', seoTitle: '', seoDescription: '' };
}

// Pick a locale's translation (defaults to 'en') from a backend translations[].
export function pickTranslation(
  translations: AdminTranslation[],
  locale: LocaleCode = DEFAULT_LOCALE,
): AdminTranslation | undefined {
  return translations.find((t) => t.locale === locale);
}

// Build the editable EN/TR/AR draft map from a backend translations[].
export function toTranslationDrafts(
  translations: AdminTranslation[],
): Record<LocaleCode, TranslationDraft> {
  const drafts = {
    en: emptyTranslation(),
    tr: emptyTranslation(),
    ar: emptyTranslation(),
  } satisfies Record<LocaleCode, TranslationDraft>;
  for (const code of LOCALE_ORDER) {
    const t = translations.find((tr) => tr.locale === code);
    if (t) {
      drafts[code] = {
        name: t.name,
        slug: t.slug,
        description: t.description ?? '',
        seoTitle: t.seoTitle ?? '',
        seoDescription: t.seoDescription ?? '',
      };
    }
  }
  return drafts;
}

// A locale draft is "complete" once it has a name + a slug — matches the
// backend publish-gate's per-locale requirement.
export function isDraftComplete(draft: TranslationDraft): boolean {
  return draft.name.trim().length > 0 && draft.slug.trim().length > 0;
}

// Per-locale flag: has the operator manually edited this locale's slug? Once a
// slug is "touched" we stop auto-deriving it from the name.
export type SlugTouched = Record<LocaleCode, boolean>;

// On load, treat any locale that already has a slug as touched so we never
// auto-rewrite an existing (possibly published) URL. New entities start with
// empty slugs → not touched → free to auto-fill from the name.
export function initialSlugTouched(drafts: Record<LocaleCode, TranslationDraft>): SlugTouched {
  return {
    en: drafts.en.slug.trim().length > 0,
    tr: drafts.tr.slug.trim().length > 0,
    ar: drafts.ar.slug.trim().length > 0,
  };
}
