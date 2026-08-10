import type { AdminProduct } from './queries';

// A product's storefront "position" only exists for PUBLISHED products, ranked
// among the published products in the SAME sub-category, ordered by sortOrder
// ascending, 1-based. Drafts/archived have no position. These pure helpers keep
// that rule in one place so the edit form + preview grid agree with the list.

// Published products of one sub-category, sorted by sortOrder ascending — the
// exact ordered group the reorder endpoint operates on.
export function publishedSiblings(
  products: readonly AdminProduct[],
  categoryId: string,
): AdminProduct[] {
  return products
    .filter((p) => p.status === 'published' && p.category?.id === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// 1-based rank of `id` within its published siblings, or 0 when not found (e.g.
// the product is a draft/archived, so it has no position).
export function positionOf(siblings: readonly AdminProduct[], id: string): number {
  const index = siblings.findIndex((p) => p.id === id);
  return index < 0 ? 0 : index + 1;
}

// The sibling id list with `id` moved to `position` (1-based, clamped to
// 1..length), the rest resequenced contiguously. Mirrors the "move to position
// N" logic used in products-page.tsx (arrayMove to position - 1).
export function moveToPosition(
  siblings: readonly AdminProduct[],
  id: string,
  position: number,
): string[] {
  const ids = siblings.map((p) => p.id);
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = Math.min(Math.max(position, 1), ids.length) - 1;
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  return ids;
}
