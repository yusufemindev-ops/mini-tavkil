import { describe, expect, it } from 'vitest';
import { decodeSlug, localizedPathMap, matchLocalizedSlug } from './localized-path';

// The real Arabic slug for "Household & Cleaning Supplies", as stored (NFC).
const AR = 'مستلزمات-المنزل-وأدوات-التنظيف';
// The exact percent-encoded form Next.js 16 hands to the page for the URL above.
const AR_ENCODED =
  '%D9%85%D8%B3%D8%AA%D9%84%D8%B2%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D9%85%D9%86%D8%B2%D9%84-%D9%88%D8%A3%D8%AF%D9%88%D8%A7%D8%AA-%D8%A7%D9%84%D8%AA%D9%86%D8%B8%D9%8A%D9%81';

describe('decodeSlug', () => {
  it('decodes a percent-encoded Arabic slug (the 404 cause)', () => {
    expect(decodeSlug(AR_ENCODED)).toBe(AR);
  });

  it('leaves an already-decoded slug unchanged', () => {
    expect(decodeSlug(AR)).toBe(AR);
    expect(decodeSlug('household-and-cleaning-supplies')).toBe('household-and-cleaning-supplies');
  });

  it('falls back to the raw value on malformed input', () => {
    expect(decodeSlug('%')).toBe('%');
  });

  it('a decoded encoded slug then matches', () => {
    const cats = [{ id: 'c', slug: AR, localizedSlugs: { ar: AR } }];
    expect(matchLocalizedSlug(cats, decodeSlug(AR_ENCODED))?.id).toBe('c');
  });
});

const CATS = [
  {
    id: 'cat-1',
    slug: 'household-and-cleaning-supplies',
    localizedSlugs: {
      en: 'household-and-cleaning-supplies',
      tr: 'ev-ve-temizlik-gerecleri',
      ar: AR,
    },
  },
  { id: 'cat-2', slug: 'textiles', localizedSlugs: { en: 'textiles', tr: 'tekstil', ar: 'نسيج' } },
];

describe('matchLocalizedSlug', () => {
  it('matches the display slug', () => {
    expect(matchLocalizedSlug(CATS, 'household-and-cleaning-supplies')?.id).toBe('cat-1');
  });

  it("matches another locale's slug (Turkish)", () => {
    expect(matchLocalizedSlug(CATS, 'ev-ve-temizlik-gerecleri')?.id).toBe('cat-1');
  });

  it('matches the Arabic slug', () => {
    expect(matchLocalizedSlug(CATS, AR)?.id).toBe('cat-1');
  });

  it('matches an Arabic slug that arrives NFD-normalized (browser sends NFC)', () => {
    // Simulate the stored slug being NFD while the incoming URL is NFC (or vice
    // versa) — the exact bug that 404'd. NFC normalization must bridge them.
    const nfd = AR.normalize('NFD');
    expect(nfd).not.toBe(AR); // sanity: the two forms really differ byte-wise
    expect(matchLocalizedSlug(CATS, nfd)?.id).toBe('cat-1');
  });

  it('returns undefined for an unknown slug', () => {
    expect(matchLocalizedSlug(CATS, 'nope')).toBeUndefined();
  });

  it('tolerates a missing localizedSlugs field', () => {
    const items = [{ id: 'x', slug: 'foo' }];
    expect(matchLocalizedSlug(items, 'foo')?.id).toBe('x');
    expect(matchLocalizedSlug(items, 'bar')).toBeUndefined();
  });
});

describe('localizedPathMap', () => {
  it('prefixes each locale slug with the base', () => {
    expect(localizedPathMap('/catalogue', { en: 'bath-towels', ar: AR })).toEqual({
      en: '/catalogue/bath-towels',
      ar: `/catalogue/${AR}`,
    });
  });

  it('skips empty slugs', () => {
    expect(localizedPathMap('/product', { en: 'x', tr: '' })).toEqual({ en: '/product/x' });
  });
});
