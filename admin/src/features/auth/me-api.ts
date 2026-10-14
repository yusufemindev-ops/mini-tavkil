import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api/client';

export interface CurrentAdmin {
  id: string;
  email: string;
  fullName: string;
  permissions: string[];
  // Display names of the admin's assigned roles, e.g. ['Super Admin'].
  roles: string[];
}

// Resolves the signed-in admin and effective RBAC permissions from Better Auth + /api/admin/me.
export async function fetchCurrentAdmin(): Promise<CurrentAdmin> {
  const { data } = await authClient.getSession();
  const user = data?.user as
    { id: string; email: string; name: string; userType?: string | null } | undefined;

  // Server-side `requireAdmin()` enforces ADMIN_ALLOWLIST on every /api/admin/* request.
  if (!user) {
    throw new Error('unauthorized');
  }

  // Fallback to empty permissions so the dashboard stays read-only on failure.
  let permissions: string[] = [];
  let roles: string[] = [];
  try {
    const res = await api.get<{
      permissions: string[];
      assignedRoles: { code: string; label: string }[];
    }>('/admin/me');
    permissions = res.permissions;
    roles = res.assignedRoles.map((r) => r.label);
  } catch {
    // Keep empty fallbacks so the dashboard defaults to read-only.
  }

  return { id: user.id, email: user.email, fullName: user.name, permissions, roles };
}
