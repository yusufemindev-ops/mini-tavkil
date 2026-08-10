import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ── Types (mirror the backend categories module: AdminCategory + DTOs) ────────

// Categories + suppliers are draft/published only (archive lives on products).
export type CatalogStatus = 'draft' | 'published';

// A localized translation row shared by category + supplier (products add
// specsMd). Mirrors the backend AdminTranslation shape.
export interface AdminTranslation {
  locale: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isComplete: boolean;
  isMachineTranslated: boolean;
}

// How a (sub-)category's products are ordered on the storefront (mirrors the
// backend). 'manual' uses sort_order; the rest are automatic. Featured pins top.
export type SortStrategy = 'manual' | 'newest' | 'price_asc' | 'price_desc' | 'moq';

export interface AdminCategory {
  id: string;
  parentId: string | null;
  imageUrl: string | null;
  displayOrder: number;
  status: string;
  sortStrategy: SortStrategy;
  createdAt: string;
  updatedAt: string;
  translations: AdminTranslation[];
}

// Payload shapes for create/update — mirror the backend zod schemas. snake_case
// fields (seo_title etc.) match the backend translation schema exactly.
export interface TranslationPayload {
  locale: string;
  name: string;
  slug: string;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_complete?: boolean;
  is_machine_translated?: boolean;
}

export interface CreateCategoryPayload {
  parentId?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  translations: TranslationPayload[];
}

export interface UpdateCategoryPayload {
  parentId?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  status?: CatalogStatus;
  sortStrategy?: SortStrategy;
  translations?: TranslationPayload[];
}

// Query keys for the categories resource. Centralized so list/detail caches can
// be invalidated together after mutations.
export const categoriesKeys = {
  all: ['categories'] as const,
  detail: (id: string) => ['categories', id] as const,
};

// ── Reads ─────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: categoriesKeys.all,
    queryFn: () => api.get<AdminCategory[]>('/admin/categories'),
    staleTime: 0,
  });
}

export function useCategory(id: string, enabled = true) {
  return useQuery({
    queryKey: categoriesKeys.detail(id),
    queryFn: () => api.get<AdminCategory>(`/admin/categories/${id}`),
    enabled,
  });
}

// ── Mutations (plain fns; pages wrap them in useMutation) ────────────────────

export function createCategory(payload: CreateCategoryPayload): Promise<AdminCategory> {
  return api.post<AdminCategory>('/admin/categories', payload);
}

export function updateCategory(id: string, payload: UpdateCategoryPayload): Promise<AdminCategory> {
  return api.patch<AdminCategory>(`/admin/categories/${id}`, payload);
}

export function deleteCategory(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/categories/${id}`);
}

export function publishCategory(id: string): Promise<AdminCategory> {
  return api.post<AdminCategory>(`/admin/categories/${id}/publish`);
}

export function unpublishCategory(id: string): Promise<AdminCategory> {
  return api.post<AdminCategory>(`/admin/categories/${id}/unpublish`);
}

// Bulk reorder a sibling group: one atomic request (display_order = list index),
// replacing the per-row PATCH-per-sibling approach.
export function reorderCategories(ids: string[]): Promise<{ ok: true }> {
  return api.post<{ ok: true }>('/admin/categories/reorder', { ids });
}

// ── Cache helpers ────────────────────────────────────────────────────────────

/**
 * Optimistically apply a new sibling order (1-based) to the caches after a drag.
 * Updates BOTH the list cache and each affected category's detail cache — the
 * edit page reads the detail cache, so skipping it leaves a stale displayOrder
 * frozen into the form until the page is remounted.
 */
export function applyReorderToCache(queryClient: QueryClient, ordered: AdminCategory[]) {
  const orderById = new Map(ordered.map((c, idx) => [c.id, idx + 1]));
  queryClient.setQueryData<AdminCategory[]>(categoriesKeys.all, (old) =>
    old?.map((c) => {
      const order = orderById.get(c.id);
      return order === undefined ? c : { ...c, displayOrder: order };
    }),
  );
  for (const [id, displayOrder] of orderById) {
    queryClient.setQueryData<AdminCategory>(categoriesKeys.detail(id), (old) =>
      old ? { ...old, displayOrder } : old,
    );
  }
}
