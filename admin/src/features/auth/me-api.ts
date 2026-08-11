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

// Source of truth for "am I a signed-in admin?" — the Better Auth session, gated
// to userType 'admin' so buyers can't access the dashboard. Throws when there's
// no admin session (useSession treats that as signed-out → redirect to /login).
export async function fetchCurrentAdmin(): Promise<CurrentAdmin> {
  const { data } = await authClient.getSession();
  const user = data?.user as
    { id: string; email: string; name: string; userType?: string | null } | undefined;

  // A session is enough. Tavkil also required `userType === 'admin'` because its
  // Better Auth instance served BUYERS as well, and the dashboard had to turn
  // them away. There is no buyer tier here (PLAN.md §3) — every account that can
  // exist is staff — so the only question that matters is whether the session is
  // allowlisted, and that is answered server-side: `requireAdmin()` re-reads
  // ADMIN_ALLOWLIST on every /api/admin/* call, and the shell itself is not
  // served without it. This check could therefore never grant access the server
  // denies; it could only deny access the server had already granted, which is
  // exactly what it did — `userType` is a custom column, Better Auth omitted it
  // from the session payload, and the comparison against `undefined` bounced
  // every signed-in admin back to /login on a loop.
  if (!user) {
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
