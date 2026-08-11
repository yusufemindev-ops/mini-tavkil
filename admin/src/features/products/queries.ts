import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ── Types (mirror the backend products module: AdminProduct + DTOs) ───────────

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface AdminProductTranslation {
  locale: string;
  name: string;
  slug: string;
  description: string | null;
  specsMd: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isComplete: boolean;
  isMachineTranslated: boolean;
}

export interface AdminProductAttribute {
  locale: string;
  name: string;
  value: string;
  sortOrder: number;
}

export interface AdminProductImage {
  id: string;
  url: string;
  /** Per-locale alt text (`{en, tr, ar}`), not one string — see ImageDraft. */
  alt: Record<string, string> | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface AdminProductOptionValue {
  id: string;
  label: string;
  imageUrl: string | null;
  colorHex: string | null;
  sortOrder: number;
}

export interface AdminProductOption {
  id: string;
  name: string;
  type: 'swatch' | 'chip';
  isVisible: boolean;
  sortOrder: number;
  values: AdminProductOptionValue[];
}

// A concrete, purchasable variant (TSC-64). Price/SKU/MOQ live here, per variant.
// `optionValueIds` are the option-VALUE db ids that define this combination (empty
// for a simple product's single default variant). Admin-only shape (carries the
// admin-only base price — never sent to public/buyer code).
export interface AdminProductVariant {
  id: string;
  sku: string | null;
  basePrice: { amount: number; currency: string | null } | null;
  moq: number;
  packSize: number | null;
  weightKg: number | null;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  optionValueIds: string[];
}

// Admin-only view — includes the admin-only base price + supplier (pricing
// visibility rule: this shape is never sent to public/buyer code).
export interface AdminProduct {
  id: string;
  // Nullable: a draft may not have a supplier/category/SKU yet.
  supplier: { id: string; name: string | null } | null;
  category: { id: string; name: string | null } | null;
  sku: string | null;
  moq: number;
  boxQuantity: number | null;
  packSize: number | null;
  weightKg: number | null;
  cbm: number | null;
  unit: string;
  hsCode: string | null;
  brandName: string | null;
  countryOfOrigin: string | null;
  gtin13: string | null;
  mpn: string | null;
  basePrice: {
    amount: number;
    currency: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  } | null;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  translations: AdminProductTranslation[];
  attributes: AdminProductAttribute[];
  options: AdminProductOption[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
}

// Payload shapes — mirror the backend zod schemas (snake_case translation
// fields, camelCase product fields).
export interface ProductTranslationPayload {
  locale: string;
  name: string;
  slug: string;
  description?: string | null;
  specs_md?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_complete?: boolean;
  is_machine_translated?: boolean;
}

export interface ProductAttributePayload {
  locale: string;
  name: string;
  value: string;
  sortOrder?: number;
}

export interface ProductImagePayload {
  url: string;
  alt?: Record<string, string>;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface ProductOptionValuePayload {
  // Client-supplied id, stable only within one save payload, so variants can
  // reference the values that define them (option/value db ids are recreated on
  // every save).
  key?: string;
  label: string;
  imageUrl?: string | null;
  colorHex?: string | null;
  sortOrder?: number;
}

export interface ProductOptionPayload {
  key?: string;
  name: string;
  type: 'swatch' | 'chip';
  isVisible?: boolean;
  sortOrder?: number;
  values?: ProductOptionValuePayload[];
}

// A concrete, purchasable variant (TSC-64). References its option values by the
// `key`s assigned to those values in the `options` payload. A simple product
// sends ONE variant with `isDefault: true` and no `optionValueKeys`.
export interface ProductVariantPayload {
  sku?: string | null;
  basePriceAmount?: number | null;
  basePriceCurrency?: string | null;
  moq?: number;
  packSize?: number | null;
  weightKg?: number | null;
  imageUrl?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  optionValueKeys?: string[];
}

// Draft-first: supplier/category/sku/translations are all optional (the backend
// enforces them only at publish), so an incomplete product can be saved.
export interface CreateProductPayload {
  supplierId?: string | null;
  categoryId?: string | null;
  sku?: string | null;
  moq?: number;
  boxQuantity?: number | null;
  packSize?: number | null;
  weightKg?: number | null;
  cbm?: number | null;
  unit?: string;
  hsCode?: string | null;
  brandName?: string | null;
  countryOfOrigin?: string | null;
  gtin13?: string | null;
  mpn?: string | null;
  basePriceAmount?: number | null;
  basePriceCurrency?: string | null;
  translations?: ProductTranslationPayload[];
  attributes?: ProductAttributePayload[];
  images?: ProductImagePayload[];
  options?: ProductOptionPayload[];
  variants?: ProductVariantPayload[];
}

export interface UpdateProductPayload {
  supplierId?: string | null;
  categoryId?: string | null;
  sku?: string | null;
  moq?: number;
  boxQuantity?: number | null;
  packSize?: number | null;
  weightKg?: number | null;
  cbm?: number | null;
  unit?: string;
  hsCode?: string | null;
  brandName?: string | null;
  countryOfOrigin?: string | null;
  gtin13?: string | null;
  mpn?: string | null;
  basePriceAmount?: number | null;
  basePriceCurrency?: string | null;
  status?: ProductStatus;
  isFeatured?: boolean;
  translations?: ProductTranslationPayload[];
  attributes?: ProductAttributePayload[];
  images?: ProductImagePayload[];
  options?: ProductOptionPayload[];
  variants?: ProductVariantPayload[];
}

export type ProductSort = 'recent' | 'oldest' | 'sku' | 'price_asc' | 'price_desc';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  supplierId?: string;
  status?: ProductStatus;
  sort?: ProductSort;
}

export interface ProductPageResult {
  items: AdminProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductStatusCounts {
  all: number;
  draft: number;
  published: number;
  archived: number;
}

// Query keys for the products resource. `all` is the invalidation root — any
// list/detail/category cache is invalidated by invalidating `all`.
export const productsKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => ['products', 'list', params] as const,
  byCategory: (categoryId: string, status: string) =>
    ['products', 'category', categoryId, status] as const,
  detail: (id: string) => ['products', id] as const,
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ── Reads ─────────────────────────────────────────────────────────────────

// Server-paginated + filtered manage list. keepPreviousData keeps the current
// page on screen while the next loads (no flash of empty table).
export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: productsKeys.list(params),
    queryFn: () =>
      api.get<ProductPageResult>(
        `/admin/products${buildQuery({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          categoryId: params.categoryId,
          supplierId: params.supplierId,
          status: params.status,
          sort: params.sort,
        })}`,
      ),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

// Per-status counts for the filter pills, respecting the same filters (search,
// category, supplier) except status itself.
export function useProductCounts(params: Omit<ProductListParams, 'status' | 'page' | 'pageSize'>) {
  return useQuery({
    queryKey: ['products', 'counts', params] as const,
    queryFn: () =>
      api.get<ProductStatusCounts>(
        `/admin/products/counts${buildQuery({
          search: params.search,
          categoryId: params.categoryId,
          supplierId: params.supplierId,
        })}`,
      ),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

// Upper bound for the "all products of one sub-category" fetch used by the
// arrange view / edit siblings / preview. A leaf sub-category realistically holds
// far fewer; callers surface a warning if a category actually hits this (so the
// truncation is never silent).
export const CATEGORY_PRODUCTS_CAP = 200;

// The full product set of ONE sub-category (bounded). Used by the arrange view
// the edit page's sibling order, and the category preview.
export function useCategoryProducts(
  categoryId: string,
  opts?: { status?: ProductStatus; enabled?: boolean },
) {
  return useQuery({
    queryKey: productsKeys.byCategory(categoryId, opts?.status ?? 'all'),
    queryFn: () =>
      api.get<ProductPageResult>(
        `/admin/products${buildQuery({ categoryId, pageSize: CATEGORY_PRODUCTS_CAP, status: opts?.status })}`,
      ),
    enabled: opts?.enabled ?? categoryId !== '',
    select: (page) => page.items,
    staleTime: 0,
  });
}

export function useProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: productsKeys.detail(id),
    queryFn: () => api.get<AdminProduct>(`/admin/products/${id}`),
    enabled,
  });
}

// ── Mutations (plain fns; pages wrap them in useMutation) ────────────────────

export function createProduct(payload: CreateProductPayload): Promise<AdminProduct> {
  return api.post<AdminProduct>('/admin/products', payload);
}

export function updateProduct(id: string, payload: UpdateProductPayload): Promise<AdminProduct> {
  return api.patch<AdminProduct>(`/admin/products/${id}`, payload);
}

export function deleteProduct(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/products/${id}`);
}

export function publishProduct(id: string): Promise<AdminProduct> {
  return api.post<AdminProduct>(`/admin/products/${id}/publish`);
}

export function unpublishProduct(id: string): Promise<AdminProduct> {
  return api.post<AdminProduct>(`/admin/products/${id}/unpublish`);
}

// Archive = discontinue for good (kept for records/SEO, off the storefront).
// Restore brings it back as a draft, not straight to published.
export function archiveProduct(id: string): Promise<AdminProduct> {
  return api.post<AdminProduct>(`/admin/products/${id}/archive`);
}

export function restoreProduct(id: string): Promise<AdminProduct> {
  return api.post<AdminProduct>(`/admin/products/${id}/restore`);
}

// Bulk reorder a sub-category's PUBLISHED products (one atomic request). `ids` is
// the full ordered list of that category's published products → sort_order = index.
export function reorderProducts(categoryId: string, ids: string[]): Promise<{ ok: true }> {
  return api.post<{ ok: true }>('/admin/products/reorder', { categoryId, ids });
}
