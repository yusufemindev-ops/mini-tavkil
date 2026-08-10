import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { applyReorderToCache, categoriesKeys, type AdminCategory } from './queries';

// Minimal AdminCategory factory — only the fields the reorder cache touches
// matter; the rest are filled to satisfy the type.
function cat(id: string, displayOrder: number): AdminCategory {
  return {
    id,
    parentId: null,
    imageUrl: null,
    displayOrder,
    status: 'published',
    sortStrategy: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [],
  };
}

function freshClient(list: AdminCategory[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(categoriesKeys.all, list);
  return qc;
}

describe('applyReorderToCache', () => {
  it('writes a 1-based order into the list cache (first item = 1, not 0)', () => {
    const list = [cat('a', 1), cat('b', 2), cat('c', 3)];
    const qc = freshClient(list);

    // Drag 'a' to the end → new sibling order [b, c, a].
    applyReorderToCache(qc, [list[1], list[2], list[0]]);

    const updated = qc.getQueryData<AdminCategory[]>(categoriesKeys.all) ?? [];
    expect(updated.find((c) => c.id === 'b')?.displayOrder).toBe(1);
    expect(updated.find((c) => c.id === 'c')?.displayOrder).toBe(2);
    expect(updated.find((c) => c.id === 'a')?.displayOrder).toBe(3);
  });

  it('also refreshes the detail cache so the edit page never reads a stale order', () => {
    const list = [cat('a', 1), cat('b', 2), cat('c', 3)];
    const qc = freshClient(list);
    // Simulate a prior Edit visit that cached the detail query for 'a'.
    qc.setQueryData(categoriesKeys.detail('a'), cat('a', 1));

    // Drag 'a' to the end → 'a' should now be order 3 everywhere.
    applyReorderToCache(qc, [list[1], list[2], list[0]]);

    const detailA = qc.getQueryData<AdminCategory>(categoriesKeys.detail('a'));
    // This is the regression: before the fix the detail cache stayed at 1.
    expect(detailA?.displayOrder).toBe(3);
  });

  it('leaves detail caches that were never visited untouched', () => {
    const list = [cat('a', 1), cat('b', 2), cat('c', 3)];
    const qc = freshClient(list);

    applyReorderToCache(qc, [list[1], list[2], list[0]]);

    // 'b' was never opened in Edit → no detail entry should be created.
    expect(qc.getQueryData(categoriesKeys.detail('b'))).toBeUndefined();
  });
});
