import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ── Types (mirror the backend rbac module) ──────────────────────────────────
export interface AdminTeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  role: { id: string; code: string; name: string } | null;
  status: 'active' | 'invited' | 'suspended';
  googleConnected: boolean;
  lastSeenAt: string | null;
  isYou: boolean;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'system' | 'custom';
  memberCount: number;
  permissions: string[];
}

export interface PermissionCatalogDomain {
  domain: string;
  actions: { action: string; code: string; name: string; description: string }[];
}

export const rbacKeys = {
  users: ['rbac', 'users'] as const,
  roles: ['rbac', 'roles'] as const,
  role: (id: string) => ['rbac', 'roles', id] as const,
  catalog: ['rbac', 'catalog'] as const,
};

// ── Reads ───────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: rbacKeys.users,
    queryFn: () => api.get<AdminTeamMember[]>('/admin/users'),
    staleTime: 0,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: rbacKeys.roles,
    queryFn: () => api.get<AdminRole[]>('/admin/roles'),
    staleTime: 0,
  });
}

export function useRole(id: string, enabled = true) {
  return useQuery({
    queryKey: rbacKeys.role(id),
    queryFn: () => api.get<AdminRole>(`/admin/roles/${id}`),
    enabled,
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: rbacKeys.catalog,
    queryFn: () => api.get<PermissionCatalogDomain[]>('/admin/permissions/catalog'),
    staleTime: 5 * 60_000, // catalog is code-defined; rarely changes
  });
}

// ── Mutations (plain fns; pages wrap them in useMutation) ────────────────────
export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}
export function createUser(payload: CreateUserPayload): Promise<AdminTeamMember> {
  return api.post<AdminTeamMember>('/admin/users', payload);
}
/**
 * Correct an invited member's name or address.
 *
 * Invited members only — the API refuses a real user id, because a signed-in
 * member's name and email are Google's copy and are refreshed on every sign-in.
 */
export function updateMember(
  id: string,
  payload: { email?: string; firstName?: string; lastName?: string },
): Promise<AdminTeamMember> {
  return api.patch<AdminTeamMember>(`/admin/users/${encodeURIComponent(id)}`, payload);
}

export function assignUserRole(id: string, roleId: string): Promise<AdminTeamMember> {
  return api.patch<AdminTeamMember>(`/admin/users/${id}/role`, { roleId });
}
export function setUserSuspended(id: string, suspended: boolean): Promise<AdminTeamMember> {
  return api.post<AdminTeamMember>(`/admin/users/${id}/${suspended ? 'suspend' : 'reactivate'}`);
}

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}
export function createRole(payload: RolePayload): Promise<AdminRole> {
  return api.post<AdminRole>('/admin/roles', payload);
}
export function updateRole(id: string, payload: RolePayload): Promise<AdminRole> {
  return api.patch<AdminRole>(`/admin/roles/${id}`, payload);
}
export function deleteRole(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/admin/roles/${id}`);
}
