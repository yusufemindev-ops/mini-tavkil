import { describe, expect, it } from 'vitest';
import type { AdminCategory } from '@/features/categories/queries';
import type { AdminProduct } from '../queries';
import { previewCatalogue, previewNav, previewProducts } from './category-nav';

// Minimal factories — only override the fields the nav logic reads.
function cat(over: Partial<AdminCategory> & { id: string }): AdminCategory {
  return {
    parentId: null,
    imageUrl: null,
    displayOrder: 0,
    status: 'published',
    sortStrategy: 'manual',
    createdAt: '',
    updatedAt: '',
    translations: [],
    ...over,
  };
}

function prod(over: Partial<AdminProduct> & { id: string }): AdminProduct {
  return {
    supplier: null,
    category: null,
    sku: over.id,
    moq: 1,
    boxQuantity: null,
    packSize: null,
    weightKg: null,
    cbm: null,
    unit: 'unit',
    hsCode: null,
    brandName: null,
    countryOfOrigin: null,
    gtin13: null,
    mpn: null,
    basePrice: null,
    status: 'published',
    sortOrder: 0,
    isFeatured: false,
    createdAt: '',
    updatedAt: '',
    translations: [],
    attributes: [],
    options: [],
    variants: [],
    images: [],
    ...over,
  };
}

// kit (top-level) → [ckw, utn]; tex (top-level, no children); draft-sub under kit.
const categories: AdminCategory[] = [
  cat({ id: 'kit', displayOrder: 1 }),
  cat({ id: 'tex', displayOrder: 2 }),
  cat({ id: 'ckw', parentId: 'kit', displayOrder: 2 }),
  cat({ id: 'utn', parentId: 'kit', displayOrder: 1 }),
  cat({ id: 'draft-sub', parentId: 'kit', displayOrder: 3, status: 'draft' }),
];

describe('previewNav', () => {
  it('returns null for an unknown id', () => {
    expect(previewNav(categories, 'nope')).toBeNull();
  });

  it('top-level: filters are its own published children, ordered, "All" = itself', () => {
    const nav = previewNav(categories, 'kit');
    expect(nav?.parent).toBeNull();
    expect(nav?.groupId).toBe('kit');
    // utn (1), ckw (2), draft-sub (3) — drafts INCLUDED (preview badges them).
    expect(nav?.filters.map((c) => c.id)).toEqual(['utn', 'ckw', 'draft-sub']);
  });

  it('sub-category: filters are its SIBLINGS (drafts included), "All" = parent', () => {
    const nav = previewNav(categories, 'ckw');
    expect(nav?.parent?.id).toBe('kit');
    expect(nav?.groupId).toBe('kit');
    expect(nav?.filters.map((c) => c.id)).toEqual(['utn', 'ckw', 'draft-sub']);
  });

  it('top-level with no children: empty filter list', () => {
    const nav = previewNav(categories, 'tex');
    expect(nav?.groupId).toBe('tex');
    expect(nav?.filters).toEqual([]);
  });
});

describe('previewCatalogue', () => {
  it('top-level categories (ordered) each with their children (drafts included)', () => {
    const sections = previewCatalogue(categories);
    // kit (order 1) before tex (order 2); tex has no children.
    expect(sections.map((s) => s.category.id)).toEqual(['kit', 'tex']);
    // kit's children ordered utn (1), ckw (2), draft-sub (3) — drafts kept.
    expect(sections[0].children.map((c) => c.id)).toEqual(['utn', 'ckw', 'draft-sub']);
    expect(sections[1].children).toEqual([]);
  });
});

describe('previewProducts', () => {
  const products: AdminProduct[] = [
    prod({ id: 'p-ckw', category: { id: 'ckw', name: 'Cookware' }, sortOrder: 2 }),
    prod({ id: 'p-utn', category: { id: 'utn', name: 'Utensils' }, sortOrder: 1 }),
    prod({ id: 'p-kit', category: { id: 'kit', name: 'Kitchenware' }, sortOrder: 3 }),
    prod({ id: 'p-tex', category: { id: 'tex', name: 'Textiles' }, sortOrder: 1 }),
    prod({
      id: 'p-draft',
      category: { id: 'ckw', name: 'Cookware' },
      status: 'draft',
      sortOrder: 0,
    }),
    prod({
      id: 'p-arch',
      category: { id: 'ckw', name: 'Cookware' },
      status: 'archived',
      sortOrder: 5,
    }),
  ];

  it('top-level aggregates own + children products INCLUDING drafts, by sortOrder', () => {
    const ids = previewProducts(products, categories, 'kit').map((p) => p.id);
    // p-draft(0), p-utn(1), p-ckw(2), p-kit(3); p-tex other tree; p-arch archived.
    expect(ids).toEqual(['p-draft', 'p-utn', 'p-ckw', 'p-kit']);
  });

  it('sub-category returns its own products incl. drafts, excl. archived', () => {
    const ids = previewProducts(products, categories, 'ckw').map((p) => p.id);
    expect(ids).toEqual(['p-draft', 'p-ckw']);
  });

  it('excludes products with no category', () => {
    const orphan = [prod({ id: 'o', category: null })];
    expect(previewProducts(orphan, categories, 'kit')).toEqual([]);
  });
});
