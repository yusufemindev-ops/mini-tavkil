import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AdminOrder, AdminOrderPage } from '@/features/orders/queries';

export type BuyerStatus = 'active' | 'suspended';

export interface Buyer {
  id: string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
  contactName: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  countryCode: string | null;
  city: string | null;
  address: string | null;
  tierMarkup: number;
  orders: number;
  status: BuyerStatus;
  verified: boolean;
  googleConnected: boolean;
  hasActiveSession: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  notes: string | null;
}

export type RequestStatus = 'pending' | 'rejected';

export interface AccountRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  countryCode: string;
  city: string | null;
  address: string | null;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
}

export interface CreateBuyerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  companyName?: string;
  jobTitle?: string;
  city?: string;
  address?: string;
  tierMarkup?: number;
  notes?: string;
}

export interface CreatedBuyer {
  id: string;
  email: string;
}

export interface UpdateBuyerInput {
  firstName?: string;
  lastName?: string;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  country?: string;
  city?: string | null;
  address?: string | null;
  tierMarkup?: number;
  notes?: string | null;
}

export interface ProfileSnapshot {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  jobTitle: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
}

export interface AdminProfileEditRequest {
  id: string;
  buyerAuthUserId: string;
  buyerEmail: string;
  status: RequestStatus;
  current: ProfileSnapshot;
  proposed: ProfileSnapshot;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const buyersKeys = {
  all: ['buyers'] as const,
  detail: (id: string) => ['buyers', id] as const,
  orders: (id: string) => ['buyers', id, 'orders'] as const,
  accountRequests: ['account-requests'] as const,
  profileEditRequests: (status: RequestStatus) => ['profile-edit-requests', status] as const,
};

export function useBuyers() {
  return useQuery({
    queryKey: buyersKeys.all,
    queryFn: () => api.get<Buyer[]>('/admin/buyers'),
  });
}

export function useBuyer(id: string, enabled = true) {
  return useQuery({
    queryKey: buyersKeys.detail(id),
    queryFn: () => api.get<Buyer>(`/admin/buyers/${id}`),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useBuyerOrders(buyerId: string, enabled = true) {
  return useQuery({
    queryKey: buyersKeys.orders(buyerId),
    queryFn: () =>
      api.get<AdminOrderPage>(`/admin/orders?buyerId=${encodeURIComponent(buyerId)}&pageSize=50`),
    select: (page): AdminOrder[] => page.items,
    enabled,
    staleTime: 0,
  });
}

export function useAccountRequests(enabled = true) {
  return useQuery({
    queryKey: buyersKeys.accountRequests,
    queryFn: () => api.get<AccountRequest[]>('/admin/account-requests'),
    enabled,
    staleTime: 0,
  });
}

export function useProfileEditRequests(status: RequestStatus, enabled = true) {
  return useQuery({
    queryKey: buyersKeys.profileEditRequests(status),
    queryFn: () =>
      api.get<AdminProfileEditRequest[]>(`/admin/profile-edit-requests?status=${status}`),
    enabled,
    staleTime: 0,
  });
}

export function createBuyer(input: CreateBuyerInput): Promise<CreatedBuyer> {
  return api.post<CreatedBuyer>('/admin/buyers', input);
}

export function updateBuyer(id: string, input: UpdateBuyerInput): Promise<Buyer> {
  return api.patch<Buyer>(`/admin/buyers/${id}`, input);
}

export function setBuyerSuspended(id: string, suspended: boolean): Promise<Buyer> {
  return api.post<Buyer>(`/admin/buyers/${id}/${suspended ? 'suspend' : 'reactivate'}`);
}

export function setBuyerVerified(id: string, verified: boolean): Promise<Buyer> {
  return api.post<Buyer>(`/admin/buyers/${id}/${verified ? 'verify' : 'unverify'}`);
}

export function deleteBuyer(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/buyers/${id}`);
}

export function approveAccountRequest(id: string, tierMarkup: number): Promise<CreatedBuyer> {
  return api.post<CreatedBuyer>(`/admin/account-requests/${id}/approve`, { tierMarkup });
}

export function rejectAccountRequest(id: string, reason?: string): Promise<{ status: 'rejected' }> {
  return api.post<{ status: 'rejected' }>(`/admin/account-requests/${id}/reject`, { reason });
}

export function reopenAccountRequest(id: string): Promise<{ status: 'pending' }> {
  return api.post<{ status: 'pending' }>(`/admin/account-requests/${id}/reopen`);
}

export function deleteAccountRequest(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/account-requests/${id}`);
}

export function approveProfileEditRequest(id: string): Promise<{ id: string; status: 'approved' }> {
  return api.post<{ id: string; status: 'approved' }>(`/admin/profile-edit-requests/${id}/approve`);
}

export function rejectProfileEditRequest(
  id: string,
  reason?: string,
): Promise<{ id: string; status: 'rejected' }> {
  return api.post<{ id: string; status: 'rejected' }>(`/admin/profile-edit-requests/${id}/reject`, {
    reason,
  });
}

export function reopenProfileEditRequest(id: string): Promise<{ id: string; status: 'pending' }> {
  return api.post<{ id: string; status: 'pending' }>(`/admin/profile-edit-requests/${id}/reopen`);
}

export function deleteProfileEditRequest(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/profile-edit-requests/${id}`);
}
