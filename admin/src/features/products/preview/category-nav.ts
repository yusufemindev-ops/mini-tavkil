// Pure navigation logic for the category preview — mirrors the storefront's
// getCategory()/getCategoryProducts() so the admin preview matches the live site
// exactly (sibling sidebar + parent aggregation). No JSX → trivially testable.

import type { AdminCategory } from '@/features/categories/queries';
import type { AdminProduct } from '../queries';

export interface PreviewNav {
  category: AdminCategory;
  // The parent category when `category` is a sub-category (drives the breadcrumb
  // and the sidebar "All" target). Null for a top-level category.
  parent: AdminCategory | null;
  // Sidebar TYPE filter set: this category's children when it's top-level, or its
  // siblings (the parent's children) when it's a sub-category. Drafts are INCLUDED
  // (preview badges them) so an admin sees an unpublished sub-category in the
  // filter before publishing; the live storefront still hides them.
  filters: AdminCategory[];
  // The group's top-level category id — the sidebar "All" target.
  groupId: string;
}

// Resolve the storefront-style navigation context for a category preview. A
// sub-category shows its siblings; a top-level shows its own children. The
// sidebar only lists PUBLISHED categories (mirrors the public catalogue).
// Returns null when the category id isn't found.
export function previewNav(
  categories: readonly AdminCategory[],
  categoryId: string,
): PreviewNav | null {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return null;
  const parent = category.parentId
    ? (categories.find((c) => c.id === category.parentId) ?? null)
    : null;
  const group = parent ?? category;
  const filters = categories
    .filter((c) => c.parentId === group.id)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return { category, parent, filters, groupId: group.id };
}

// Catalogue-index preview data: every TOP-LEVEL category (drafts included, badged
// in the UI) with its direct children, ordered. Mirrors the storefront catalogue
// landing (getCatalogueCategories) but keeps drafts so an admin can preview
// unpublished categories/sub-categories + their tile images before publishing.
export interface PreviewCatalogueSection {
  category: AdminCategory;
  children: AdminCategory[];
}

export function previewCatalogue(categories: readonly AdminCategory[]): PreviewCatalogueSection[] {
  return categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      category,
      children: categories
        .filter((c) => c.parentId === category.id)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }));
}

// Products shown under a category preview. A top-level category aggregates its
// own + all direct children's products; a sub-category returns just its own.
// DRAFTS are INCLUDED (badged in the card) so an admin can preview an unpublished
// product before publishing — only ARCHIVED products are hidden. The live
// storefront still shows published-only. Ordered by sortOrder ascending.
export function previewProducts(
  products: readonly AdminProduct[],
  categories: readonly AdminCategory[],
  categoryId: string,
): AdminProduct[] {
  const childIds = categories.filter((c) => c.parentId === categoryId).map((c) => c.id);
  const ids = new Set<string>([categoryId, ...childIds]);
  return products
    .filter((p) => p.status !== 'archived' && p.category != null && ids.has(p.category.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
