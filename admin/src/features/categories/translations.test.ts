import { describe, expect, it } from 'vitest';
import type { AdminTranslation } from './queries';
import {
  emptyTranslation,
  initialSlugTouched,
  isDraftComplete,
  LOCALE_ORDER,
  toTranslationDrafts,
} from './translations';

function t(partial: Partial<AdminTranslation>): AdminTranslation {
  return {
    locale: 'en',
    name: '',
    slug: '',
    description: null,
    seoTitle: null,
    seoDescription: null,
    isComplete: false,
    isMachineTranslated: false,
    ...partial,
  };
}

describe('toTranslationDrafts', () => {
  it('always returns a draft for every supported locale', () => {
    const drafts = toTranslationDrafts([]);
    expect(LOCALE_ORDER.every((code) => drafts[code])).toBe(true);
  });

  it('maps backend nulls to empty strings so inputs stay controlled', () => {
    const drafts = toTranslationDrafts([t({ locale: 'en', name: 'Tools', slug: 'tools' })]);
    expect(drafts.en).toEqual({
      name: 'Tools',
      slug: 'tools',
      description: '',
      seoTitle: '',
      seoDescription: '',
    });
    expect(drafts.tr).toEqual(emptyTranslation());
  });

  it('hydrates each provided locale independently', () => {
    const drafts = toTranslationDrafts([
      t({ locale: 'en', name: 'Tools', slug: 'tools' }),
      t({ locale: 'ar', name: 'أدوات', slug: 'adawat' }),
    ]);
    expect(drafts.en.name).toBe('Tools');
    expect(drafts.ar.name).toBe('أدوات');
    expect(drafts.tr.name).toBe('');
  });
});

describe('initialSlugTouched', () => {
  it('marks a locale touched only when its slug is already non-empty', () => {
    const drafts = toTranslationDrafts([
      t({ locale: 'en', name: 'Tools', slug: 'tools' }),
      t({ locale: 'ar', name: 'أدوات', slug: '' }),
    ]);
    const touched = initialSlugTouched(drafts);
    expect(touched.en).toBe(true);
    expect(touched.tr).toBe(false);
    expect(touched.ar).toBe(false);
  });

  it('treats a brand-new entity (all empty slugs) as untouched everywhere', () => {
    const touched = initialSlugTouched(toTranslationDrafts([]));
    expect(touched).toEqual({ en: false, tr: false, ar: false });
  });

  it('ignores whitespace-only slugs', () => {
    const drafts = toTranslationDrafts([t({ locale: 'en', name: 'X', slug: '   ' })]);
    expect(initialSlugTouched(drafts).en).toBe(false);
  });
});

describe('isDraftComplete', () => {
  it('requires a non-empty name and slug', () => {
    expect(isDraftComplete({ ...emptyTranslation(), name: 'X', slug: 'x' })).toBe(true);
    expect(isDraftComplete({ ...emptyTranslation(), name: 'X', slug: '' })).toBe(false);
    expect(isDraftComplete({ ...emptyTranslation(), name: '   ', slug: 'x' })).toBe(false);
  });
});
