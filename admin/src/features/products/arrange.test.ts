import { describe, expect, it } from 'vitest';
import { effectiveOrder } from './arrange-page';
import type { AdminProduct } from './queries';
import type { SortStrategy } from '@/features/categories/queries';

// Minimal product factory — only the fields effectiveOrder reads.
function p(
  id: string,
  over: Partial<Pick<AdminProduct, 'isFeatured' | 'sortOrder' | 'moq' | 'createdAt'>> & {
    name?: string;
    price?: number;
  } = {},
): AdminProduct {
  return {
    id,
    supplier: null,
    category: null,
    sku: id,
    moq: over.moq ?? 1,
    boxQuantity: null,
    packSize: null,
    weightKg: null,
    cbm: null,
    unit: 'piece',
    hsCode: null,
    brandName: null,
    countryOfOrigin: null,
    gtin13: null,
    mpn: null,
    basePrice:
      over.price != null
        ? { amount: over.price, currency: 'USD', updatedAt: null, updatedBy: null }
        : null,
    status: 'published',
    sortOrder: over.sortOrder ?? 0,
    isFeatured: over.isFeatured ?? false,
    createdAt: over.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: '',
    translations: [
      {
        locale: 'en',
        name: over.name ?? id,
        slug: id,
        description: null,
        specsMd: null,
        seoTitle: null,
        seoDescription: null,
        isComplete: true,
        isMachineTranslated: false,
      },
    ],
    attributes: [],
    options: [],
    variants: [],
    images: [],
  };
}

const ids = (list: AdminProduct[]) => list.map((x) => x.id);
const order = (list: AdminProduct[], s: SortStrategy) => ids(effectiveOrder(list, s));

describe('effectiveOrder', () => {
  it('manual → by sortOrder ascending', () => {
    const list = [p('a', { sortOrder: 2 }), p('b', { sortOrder: 0 }), p('c', { sortOrder: 1 })];
    expect(order(list, 'manual')).toEqual(['b', 'c', 'a']);
  });

  it('featured products pin to the top regardless of strategy', () => {
    const list = [
      p('a', { sortOrder: 0 }),
      p('b', { sortOrder: 1, isFeatured: true }),
      p('c', { sortOrder: 2 }),
    ];
    expect(order(list, 'manual')[0]).toBe('b');
  });

  it('newest → by createdAt descending', () => {
    const list = [
      p('old', { createdAt: '2026-01-01T00:00:00.000Z' }),
      p('new', { createdAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(order(list, 'newest')).toEqual(['new', 'old']);
  });

  it('price_asc / price_desc order by base price', () => {
    const list = [p('mid', { price: 20 }), p('low', { price: 5 }), p('high', { price: 99 })];
    expect(order(list, 'price_asc')).toEqual(['low', 'mid', 'high']);
    expect(order(list, 'price_desc')).toEqual(['high', 'mid', 'low']);
  });

  it('moq → ascending', () => {
    expect(order([p('big', { moq: 100 }), p('small', { moq: 1 })], 'moq')).toEqual([
      'small',
      'big',
    ]);
  });

  it('featured pins on top even under an auto strategy (an older featured beats a newer plain)', () => {
    const list = [
      p('new-plain', { createdAt: '2026-06-01T00:00:00.000Z' }),
      p('old-featured', { createdAt: '2026-01-01T00:00:00.000Z', isFeatured: true }),
    ];
    expect(order(list, 'newest')).toEqual(['old-featured', 'new-plain']);
  });

  it('treats a missing base price as 0 for price sorts', () => {
    const list = [p('priced', { price: 10 }), p('noprice')];
    expect(order(list, 'price_asc')).toEqual(['noprice', 'priced']);
  });

  it('does not mutate the input array', () => {
    const list = [p('a', { sortOrder: 2 }), p('b', { sortOrder: 0 })];
    const before = ids(list);
    effectiveOrder(list, 'manual');
    expect(ids(list)).toEqual(before);
  });
});
