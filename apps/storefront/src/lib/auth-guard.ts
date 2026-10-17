import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { authUser, authUserRoles, permissions, rolePermissions, roles } from '@/lib/db/schema';
import { AuthError } from '@/lib/api/errors';
import { adminAllowlist, isAllowlisted } from '@/lib/permissions/allowlist';
import { allowedEmails } from '@/lib/services/team';
import { OWNER_ROLE, roleGrants } from '@/lib/permissions/catalog';

/**
 * Admin authentication and RBAC permission guards.
 * Enforces live session allowlist and permission requirements on protected routes.
 */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  banned: boolean;
};

export { AuthError };
export { adminAllowlist, isAllowlisted };

/** The signed-in admin, or null. Never throws — for pages that render either way. */
export async function getAdmin(request: Request): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user?.email) return null;
  // Verify email is present in allowlist or active team invites.
  const allowed = await allowedEmails();
  if (!allowed.has(user.email.trim().toLowerCase())) return null;

  // Check banned status and retrieve lastSeenAt in single query.
  const [row] = await db
    .select({ banned: authUser.banned, lastSeenAt: authUser.lastSeenAt })
    .from(authUser)
    .where(eq(authUser.id, user.id))
    .limit(1);
  if (row?.banned) return null;

  await touchLastSeen(user.id, row?.lastSeenAt ?? null);

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    image: user.image ?? null,
    banned: false,
  };
}

/** Throttle lastSeenAt writes to at most once per minute. */
const SEEN_WRITE_INTERVAL_MS = 60_000;

/** Updates admin's lastSeenAt timestamp if throttled interval has elapsed. */
async function touchLastSeen(userId: string, current: string | null): Promise<void> {
  if (current) {
    const seen = Date.parse(`${current.replace(' ', 'T')}Z`);
    if (Number.isFinite(seen) && Date.now() - seen < SEEN_WRITE_INTERVAL_MS) return;
  }
  await db
    .update(authUser)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(authUser.id, userId));
}

/** Throws AuthError(401) when there is no allowlisted, unbanned session. */
export async function requireAdmin(request: Request): Promise<AdminUser> {
  const admin = await getAdmin(request);
  if (!admin) throw new AuthError(401, 'Not authenticated');
  return admin;
}

/** Resolves all permission codes for a user. Owner role inherits all permissions. */
export async function permissionsFor(userId: string): Promise<Set<string>> {
  const assigned = await db
    .select({ code: roles.code })
    .from(authUserRoles)
    .innerJoin(roles, eq(roles.id, authUserRoles.roleId))
    .where(eq(authUserRoles.authUserId, userId));

  if (assigned.some((role) => role.code === OWNER_ROLE)) {
    return new Set(roleGrants(OWNER_ROLE));
  }

  const granted = await db
    .select({ code: permissions.code })
    .from(authUserRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, authUserRoles.roleId))
    .innerJoin(
      permissions,
      and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.deprecated, false)),
    )
    .where(eq(authUserRoles.authUserId, userId));

  return new Set(granted.map((row) => row.code));
}

/** The role codes this user actually holds — for display, not for authorisation. */
export async function rolesFor(userId: string): Promise<string[]> {
  const assigned = await db
    .select({ code: roles.code })
    .from(authUserRoles)
    .innerJoin(roles, eq(roles.id, authUserRoles.roleId))
    .where(eq(authUserRoles.authUserId, userId));
  return assigned.map((row) => row.code);
}

/** Enforces admin authentication and specific RBAC permission code. */
export async function requirePermission(request: Request, code: string): Promise<AdminUser> {
  const admin = await requireAdmin(request);
  const held = await permissionsFor(admin.id);
  if (!held.has(code)) throw new AuthError(403, `Missing permission: ${code}`);
  return admin;
}

/** Turns an AuthError into a JSON response; rethrows anything else. */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
