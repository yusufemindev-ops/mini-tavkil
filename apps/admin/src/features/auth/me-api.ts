import { authClient } from '@/lib/auth-client';
import { ApiError, api } from '@/lib/api/client';

export interface CurrentAdmin {
  id: string;
  email: string;
  fullName: string;
  permissions: string[];
  roles: string[];
}

// Resolves the signed-in admin and effective RBAC permissions from Better Auth + /api/admin/me.
export async function fetchCurrentAdmin(): Promise<CurrentAdmin | null> {
  const { data } = await authClient.getSession();
  const user = data?.user as
    { id: string; email: string; name: string; userType?: string | null } | undefined;

  if (!user) {
    return null;
  }

  try {
    const res = await api.get<{
      permissions: string[];
      assignedRoles: { code: string; label: string }[];
    }>('/admin/me');
    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      permissions: res.permissions,
      roles: res.assignedRoles.map((r) => r.label),
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}
