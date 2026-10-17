import { describe, expect, it } from 'vitest';
import type { AdminProduct } from './queries';
import { moveToPosition, positionOf, publishedSiblings } from './ordering';

function product(partial: Partial<AdminProduct>): AdminProduct {
  return {
    id: 'p1',
    supplier: { id: 's1', name: 'Aydin Industrial' },
    category: { id: 'c1', name: 'Cleaning' },
    sku: 'SKU-001',
    moq: 1,
    boxQuantity: null,
    packSize: null,
    weightKg: null,
    cbm: null,
    options: [],
    variants: [],
    unit: 'piece',
    hsCode: null,
    brandName: null,
    countryOfOrigin: null,
    gtin13: null,
    mpn: null,
    basePrice: null,
    status: 'published',
    sortOrder: 0,
    isFeatured: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [],
    attributes: [],
    images: [],
    ...partial,
  };
}

// A mixed catalog: c1 has three published (out of order) + one draft + one
// archived; c2 has one published; a published product with no category.
const PRODUCTS: AdminProduct[] = [
  product({ id: 'a', status: 'published', sortOrder: 2 }),
  product({ id: 'b', status: 'published', sortOrder: 0 }),
  product({ id: 'c', status: 'published', sortOrder: 1 }),
  product({ id: 'd', status: 'draft', sortOrder: 5 }),
  product({ id: 'e', status: 'archived', sortOrder: 6 }),
  product({ id: 'f', status: 'published', sortOrder: 0, category: { id: 'c2', name: 'Pumps' } }),
  product({ id: 'g', status: 'published', sortOrder: 9, category: null }),
];

describe('publishedSiblings', () => {
  it('keeps only published products of the category, sorted by sortOrder asc', () => {
    expect(publishedSiblings(PRODUCTS, 'c1').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('excludes drafts, archived, other categories, and uncategorized', () => {
    const ids = publishedSiblings(PRODUCTS, 'c1').map((p) => p.id);
    expect(ids).not.toContain('d');
    expect(ids).not.toContain('e');
    expect(ids).not.toContain('f');
    expect(ids).not.toContain('g');
  });

  it('returns a single-item group for a category with one published product', () => {
    expect(publishedSiblings(PRODUCTS, 'c2').map((p) => p.id)).toEqual(['f']);
  });

  it('returns empty for an unknown category', () => {
    expect(publishedSiblings(PRODUCTS, 'nope')).toEqual([]);
  });
});

describe('positionOf', () => {
  const siblings = publishedSiblings(PRODUCTS, 'c1'); // [b, c, a]

  it('returns the 1-based rank within siblings', () => {
    expect(positionOf(siblings, 'b')).toBe(1);
    expect(positionOf(siblings, 'c')).toBe(2);
    expect(positionOf(siblings, 'a')).toBe(3);
  });

  it('returns 0 when the id is not a sibling (draft/archived/other)', () => {
    expect(positionOf(siblings, 'd')).toBe(0);
    expect(positionOf(siblings, 'missing')).toBe(0);
  });
});

describe('moveToPosition', () => {
  const siblings = publishedSiblings(PRODUCTS, 'c1'); // [b, c, a]

  it('moves a product down to a later position', () => {
    expect(moveToPosition(siblings, 'b', 3)).toEqual(['c', 'a', 'b']);
  });

  it('moves a product up to an earlier position', () => {
    expect(moveToPosition(siblings, 'a', 1)).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when moved to its current position', () => {
    expect(moveToPosition(siblings, 'c', 2)).toEqual(['b', 'c', 'a']);
  });

  it('clamps positions below 1 to the first slot', () => {
    expect(moveToPosition(siblings, 'a', 0)).toEqual(['a', 'b', 'c']);
    expect(moveToPosition(siblings, 'a', -5)).toEqual(['a', 'b', 'c']);
  });

  it('clamps positions past the end to the last slot', () => {
    expect(moveToPosition(siblings, 'b', 99)).toEqual(['c', 'a', 'b']);
  });

  it('returns the unchanged id list when the id is absent', () => {
    expect(moveToPosition(siblings, 'missing', 1)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input siblings array', () => {
    const before = siblings.map((p) => p.id);
    moveToPosition(siblings, 'b', 3);
    expect(siblings.map((p) => p.id)).toEqual(before);
  });
});
