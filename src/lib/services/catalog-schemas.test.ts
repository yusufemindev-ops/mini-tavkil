import { describe, expect, it } from 'vitest';
import {
  createCategorySchema,
  reorderSchema,
  SORT_STRATEGIES,
  translationSchema,
  updateCategorySchema,
} from './catalog-schemas';

const base = { locale: 'en', name: 'Bath towels', slug: 'bath-towels' };

describe('translation slug', () => {
  it('accepts lowercase Latin with hyphens', () => {
    expect(translationSchema.parse(base).slug).toBe('bath-towels');
  });

  it('accepts an Arabic slug', () => {
    // The storefront generates and indexes non-Latin slugs for RTL SEO. A
    // Latin-only regex would make Arabic URLs quietly impossible.
    const parsed = translationSchema.parse({
      locale: 'ar',
      name: 'مناشف حمام',
      slug: 'مناشف-حمام',
    });
    expect(parsed.slug).toBe('مناشف-حمام');
  });

  it('accepts a Turkish slug with digits', () => {
    expect(translationSchema.parse({ ...base, locale: 'tr', slug: 'banyo-havlulari-5' }).slug).toBe(
      'banyo-havlulari-5',
    );
  });

  it('normalises to NFC', () => {
    // Arabic can be encoded two visually-identical ways. A browser normalises the
    // URL path to NFC, so a slug stored as NFD never matches and the page 404s.
    const nfd = 'قناع'.normalize('NFD');
    const parsed = translationSchema.parse({ locale: 'ar', name: 'قناع', slug: nfd });
    expect(parsed.slug).toBe(parsed.slug.normalize('NFC'));
  });

  it.each([
    ['uppercase', 'Bath-Towels'],
    ['spaces', 'bath towels'],
    ['a leading hyphen', '-bath'],
    ['a trailing hyphen', 'bath-'],
    ['a double hyphen', 'bath--towels'],
    ['a slash', 'bath/towels'],
    ['empty', ''],
  ])('rejects %s', (_label, slug) => {
    expect(translationSchema.safeParse({ ...base, slug }).success).toBe(false);
  });

  it('rejects a locale the site does not serve', () => {
    expect(translationSchema.safeParse({ ...base, locale: 'de' }).success).toBe(false);
  });
});

describe('category schemas', () => {
  it('allows a draft with no translations at all', () => {
    // Draft-first: an incomplete category must be saveable. The publish gate is
    // where completeness is enforced, not here.
    expect(createCategorySchema.safeParse({}).success).toBe(true);
  });

  it('rejects a non-uuid parentId', () => {
    expect(createCategorySchema.safeParse({ parentId: 'not-a-uuid' }).success).toBe(false);
  });

  it('allows clearing the parent with null', () => {
    expect(createCategorySchema.safeParse({ parentId: null }).success).toBe(true);
  });

  it('rejects a negative display order', () => {
    expect(createCategorySchema.safeParse({ displayOrder: -1 }).success).toBe(false);
  });

  it('offers no price sort strategy', () => {
    // Tavkil had price_asc / price_desc. There is no public price here, so a
    // storefront honouring them would order by a number it must never reveal —
    // and the ordering itself would leak the ranking.
    expect(SORT_STRATEGIES).not.toContain('price_asc');
    expect(SORT_STRATEGIES).not.toContain('price_desc');
    expect(updateCategorySchema.safeParse({ sortStrategy: 'price_asc' }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ sortStrategy: 'moq' }).success).toBe(true);
  });

  it('allows only draft or published — categories are never archived', () => {
    expect(updateCategorySchema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(updateCategorySchema.safeParse({ status: 'published' }).success).toBe(true);
    expect(updateCategorySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('requires at least one id to reorder', () => {
    expect(reorderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [crypto.randomUUID()] }).success).toBe(true);
  });
});
