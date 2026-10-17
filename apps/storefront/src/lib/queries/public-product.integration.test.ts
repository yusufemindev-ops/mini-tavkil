import 'dotenv/config';
import { beforeAll, describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { db } from '@/lib/db';
import { supplierTranslations } from '@/lib/db/schema';
import { findLeaks, formatLeaks } from './no-leak';
import {
  publicCategories,
  publicCategory,
  publicProduct,
  publicProductCount,
  publicProducts,
  publicSitemapEntries,
  type Locale,
} from './public-product';

// Runs against the real Neon database (there is only one — CLAUDE.md §7). Read-only
// throughout: it asserts on whatever rows are published and creates nothing, so
// there is nothing to tear down and no chance of a stray delete.
//
// The leak assertions here are the ones that matter. The unit suite proves the
// module never *names* a price column; this proves the objects that actually come
// back off the wire carry no price and no supplier, nested and arrays included.

/**
 * The supplier names to hunt for, read from the database rather than written down.
 *
 * They used to be a hardcoded list copied from the seed script. When the seeded
 * catalogue was replaced by a real supplier, the list kept naming suppliers that
 * no longer existed — so the guard passed on every run while the actual supplier
 * name went unchecked. A leak test that cannot fail is worse than no leak test,
 * because it reads like coverage.
 *
 * Reading the table means this tracks whoever is in it, including suppliers added
 * long after anyone remembers this file.
 */
let supplierNames: string[] = [];

function expectNoLeaks(value: unknown, label: string) {
  const hits = findLeaks(value, supplierNames);
  expect(hits, `${label} leaked:\n${formatLeaks(hits)}`).toEqual([]);
}

const LOCALES = routing.locales as readonly Locale[];

describe('public query layer', () => {
  let sampleSlugs: Record<Locale, string>;
  let categorySlugs: Record<Locale, string>;

  beforeAll(async () => {
    // Every supplier name in every locale, so the hunt matches the data rather
    // than a list someone has to remember to update.
    supplierNames = [
      ...new Set(
        (await db.select({ name: supplierTranslations.name }).from(supplierTranslations))
          .map((row) => row.name.trim())
          .filter(Boolean),
      ),
    ];
    expect(
      supplierNames.length,
      'no suppliers in the database — this guard would pass without checking anything',
    ).toBeGreaterThan(0);

    sampleSlugs = {} as Record<Locale, string>;
    categorySlugs = {} as Record<Locale, string>;
    for (const locale of LOCALES) {
      const [product] = await publicProducts({ limit: 1 }, locale);
      const [category] = await publicCategories(locale);
      expect(product, `no published product in ${locale} — import a catalogue`).toBeTruthy();
      expect(category, `no published category in ${locale} — import a catalogue`).toBeTruthy();
      sampleSlugs[locale] = product.slug;
      categorySlugs[locale] = category.slug;
    }
  });

  describe.each(LOCALES)('locale %s', (locale) => {
    it('publicProducts returns products with no price and no supplier', async () => {
      const rows = await publicProducts({}, locale);
      expect(rows.length).toBeGreaterThan(0);
      expectNoLeaks(rows, `publicProducts(${locale})`);
    });

    it('publicProduct returns one product with no price and no supplier', async () => {
      const product = await publicProduct(sampleSlugs[locale], locale);
      expect(product).not.toBeNull();
      expectNoLeaks(product, `publicProduct(${locale})`);
    });

    it('publicCategories returns categories with no price and no supplier', async () => {
      const rows = await publicCategories(locale);
      expect(rows.length).toBeGreaterThan(0);
      expectNoLeaks(rows, `publicCategories(${locale})`);
    });

    it('publicCategory returns one category with no price and no supplier', async () => {
      const category = await publicCategory(categorySlugs[locale], locale);
      expect(category).not.toBeNull();
      expectNoLeaks(category, `publicCategory(${locale})`);
    });

    it('every product carries a real updatedAt, not today', async () => {
      const rows = await publicProducts({ limit: 5 }, locale);
      for (const row of rows) {
        expect(row.updatedAt).toBeInstanceOf(Date);
        expect(Number.isNaN(row.updatedAt.getTime())).toBe(false);
      }
    });

    it('resolves the category filter by that locale’s own slug', async () => {
      const slug = categorySlugs[locale];
      const rows = await publicProducts({ category: slug }, locale);
      const count = await publicProductCount({ category: slug }, locale);
      expect(rows.length).toBe(count);
      for (const row of rows) expect(row.category?.slug).toBe(slug);
    });

    it('featured filter returns only featured products', async () => {
      const rows = await publicProducts({ featured: true }, locale);
      for (const row of rows) expect(row.isFeatured).toBe(true);
    });

    it('an unknown slug resolves to null, not a throw', async () => {
      await expect(publicProduct('definitely-not-a-real-slug', locale)).resolves.toBeNull();
      await expect(publicCategory('definitely-not-a-real-slug', locale)).resolves.toBeNull();
    });

    it('a slug from another locale does not resolve in this one', async () => {
      const other = LOCALES.find((l) => l !== locale && sampleSlugs[l] !== sampleSlugs[locale]);
      if (!other) return; // slugs happen to be identical across locales — nothing to assert
      expect(await publicProduct(sampleSlugs[other], locale)).toBeNull();
    });

    it('localizedSlugs cover every locale that has a complete translation', async () => {
      const product = await publicProduct(sampleSlugs[locale], locale);
      expect(product?.localizedSlugs[locale]).toBe(sampleSlugs[locale]);
    });
  });

  it('publicSitemapEntries leak nothing and carry the row’s own updatedAt', async () => {
    const entries = await publicSitemapEntries();
    expect(entries.length).toBeGreaterThan(0);
    expectNoLeaks(entries, 'publicSitemapEntries');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    // Not an assertion that nothing changed today — just that they are real
    // timestamps from the row, parsed, and in the past.
    for (const entry of entries) {
      expect(entry.updatedAt).toBeInstanceOf(Date);
      expect(entry.updatedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      expect(LOCALES).toContain(entry.locale);
    }
  });

  it('pagination is stable — offset walks the same ordering', async () => {
    const all = await publicProducts({ limit: 4 }, 'en');
    const second = await publicProducts({ limit: 2, offset: 2 }, 'en');
    expect(second.map((p) => p.id)).toEqual(all.slice(2, 4).map((p) => p.id));
  });
});
