import { describe, expect, it } from 'vitest';
import type { AdminProduct, AdminProductTranslation } from './queries';
import { filterProducts, hasMissingTranslation, initialSupplierFilter } from './filter';

function tr(partial: Partial<AdminProductTranslation>): AdminProductTranslation {
  return {
    locale: 'en',
    name: '',
    slug: '',
    description: null,
    specsMd: null,
    seoTitle: null,
    seoDescription: null,
    isComplete: false,
    isMachineTranslated: false,
    ...partial,
  };
}

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
    translations: [tr({ locale: 'en', name: 'Mop', slug: 'mop', isComplete: true })],
    attributes: [],
    images: [],
    ...partial,
  };
}

const PRODUCTS: AdminProduct[] = [
  product({ id: 'p1', status: 'published', sku: 'MOP-1' }),
  product({
    id: 'p2',
    status: 'draft',
    sku: 'PUMP-2',
    category: { id: 'c2', name: 'Pumps' },
    supplier: { id: 's2', name: 'Marmara Pumps' },
    translations: [tr({ locale: 'en', name: 'Pump', slug: 'pump', isComplete: true })],
  }),
  product({
    id: 'p3',
    status: 'archived',
    sku: 'LED-3',
    translations: [tr({ locale: 'en', name: 'LED', slug: 'led', isComplete: false })],
  }),
];

const ALL = { status: 'all' as const, search: '', category: 'all', supplier: 'all' };

describe('filterProducts', () => {
  it('returns everything for the default query', () => {
    expect(filterProducts(PRODUCTS, ALL)).toHaveLength(PRODUCTS.length);
  });

  it('narrows to a single status', () => {
    const drafts = filterProducts(PRODUCTS, { ...ALL, status: 'draft' });
    expect(drafts.every((p) => p.status === 'draft')).toBe(true);
    expect(drafts).toHaveLength(1);
  });

  it('"missing" returns only products with an incomplete locale', () => {
    const missing = filterProducts(PRODUCTS, { ...ALL, status: 'missing' });
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every(hasMissingTranslation)).toBe(true);
  });

  it('filters by category id', () => {
    const hits = filterProducts(PRODUCTS, { ...ALL, category: 'c2' });
    expect(hits.map((p) => p.id)).toEqual(['p2']);
  });

  it('filters by supplier id', () => {
    const hits = filterProducts(PRODUCTS, { ...ALL, supplier: 's2' });
    expect(hits.map((p) => p.id)).toEqual(['p2']);
  });

  it('search matches sku case-insensitively', () => {
    const hits = filterProducts(PRODUCTS, { ...ALL, search: 'mop-1' });
    expect(hits.map((p) => p.id)).toEqual(['p1']);
  });

  it('search matches the supplier name', () => {
    const hits = filterProducts(PRODUCTS, { ...ALL, search: 'marmara' });
    expect(hits.map((p) => p.id)).toEqual(['p2']);
  });

  it('combines filters (status AND search)', () => {
    const hits = filterProducts(PRODUCTS, { ...ALL, status: 'published', search: 'mop' });
    expect(hits.every((p) => p.status === 'published')).toBe(true);
    expect(hits.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('initialSupplierFilter', () => {
  it('defaults to "all" when no ?supplier= param is present', () => {
    expect(initialSupplierFilter(null)).toBe('all');
  });

  it('honors the ?supplier=<id> deep link from the Suppliers page', () => {
    expect(initialSupplierFilter('s2')).toBe('s2');
  });

  it('pre-filters products to the deep-linked supplier', () => {
    const supplier = initialSupplierFilter('s2');
    const hits = filterProducts(PRODUCTS, { ...ALL, supplier });
    expect(hits.map((p) => p.id)).toEqual(['p2']);
  });
});
