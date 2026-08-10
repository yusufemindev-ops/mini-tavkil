import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  AdminTranslation,
  CatalogStatus,
  TranslationPayload,
} from '@/features/categories/queries';

// ── Types (mirror the backend suppliers module: AdminSupplier + DTOs) ─────────

export interface AdminSupplier {
  id: string;
  countryCode: string;
  logoUrl: string | null;
  website: string | null;
  contactEmailInternal: string | null;
  contactPhoneInternal: string | null;
  isVerified: boolean;
  internalNotes: string | null;
  address: string | null;
  mapUrl: string | null;
  status: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  translations: AdminTranslation[];
}

export interface CreateSupplierPayload {
  countryCode: string;
  logoUrl?: string | null;
  website?: string | null;
  contactEmailInternal?: string | null;
  contactPhoneInternal?: string | null;
  isVerified?: boolean;
  internalNotes?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  translations: TranslationPayload[];
}

export interface UpdateSupplierPayload {
  countryCode?: string;
  logoUrl?: string | null;
  website?: string | null;
  contactEmailInternal?: string | null;
  contactPhoneInternal?: string | null;
  isVerified?: boolean;
  internalNotes?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  status?: CatalogStatus;
  translations?: TranslationPayload[];
}

// Query keys for the suppliers resource. Centralized so list/detail caches can
// be invalidated together after mutations.
export const suppliersKeys = {
  all: ['suppliers'] as const,
  detail: (id: string) => ['suppliers', id] as const,
};

// ── Reads ─────────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: suppliersKeys.all,
    queryFn: () => api.get<AdminSupplier[]>('/admin/suppliers'),
    staleTime: 0,
  });
}

export function useSupplier(id: string, enabled = true) {
  return useQuery({
    queryKey: suppliersKeys.detail(id),
    queryFn: () => api.get<AdminSupplier>(`/admin/suppliers/${id}`),
    enabled,
  });
}

// ── Mutations (plain fns; pages wrap them in useMutation) ────────────────────

export function createSupplier(payload: CreateSupplierPayload): Promise<AdminSupplier> {
  return api.post<AdminSupplier>('/admin/suppliers', payload);
}

export function updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<AdminSupplier> {
  return api.patch<AdminSupplier>(`/admin/suppliers/${id}`, payload);
}

export function deleteSupplier(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/suppliers/${id}`);
}

export function publishSupplier(id: string): Promise<AdminSupplier> {
  return api.post<AdminSupplier>(`/admin/suppliers/${id}/publish`);
}

export function unpublishSupplier(id: string): Promise<AdminSupplier> {
  return api.post<AdminSupplier>(`/admin/suppliers/${id}/unpublish`);
}
