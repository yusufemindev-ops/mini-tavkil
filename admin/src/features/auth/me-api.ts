import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api/client';
import { USER_TYPE } from './auth-constants';

export interface CurrentAdmin {
  id: string;
  email: string;
  fullName: string;
  permissions: string[];
  // Display names of the admin's assigned roles, e.g. ['Super Admin'].
  roles: string[];
}

// Source of truth for "am I a signed-in admin?" — the Better Auth session, gated
// to userType 'admin' so buyers can't access the dashboard. Throws when there's
// no admin session (useSession treats that as signed-out → redirect to /login).
export async function fetchCurrentAdmin(): Promise<CurrentAdmin> {
  const { data } = await authClient.getSession();
  const user = data?.user as
    { id: string; email: string; name: string; userType?: string | null } | undefined;

  if (!user || user.userType !== USER_TYPE.ADMIN) {
    throw new Error('unauthorized');
  }

  // Effective RBAC permissions (super_admin → ['*']) + assigned roles. Falls back
  // to none if the call fails, so the dashboard stays read-only rather than
  // wrongly granting.
  let permissions: string[] = [];
  let roles: string[] = [];
  try {
    const res = await api.get<{ permissions: string[]; roles: { code: string; name: string }[] }>(
      '/admin/permissions',
    );
    permissions = res.permissions;
    roles = res.roles.map((r) => r.name);
  } catch {
    // Keep the empty fallbacks — dashboard stays read-only rather than wrongly granting.
  }

  return { id: user.id, email: user.email, fullName: user.name, permissions, roles };
}
