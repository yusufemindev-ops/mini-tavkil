import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { authUser, authUserRoles, permissions, rolePermissions, roles } from '@/lib/db/schema';
import { AuthError } from '@/lib/api/errors';
import { adminAllowlist, isAllowlisted } from '@/lib/permissions/allowlist';
import { OWNER_ROLE, roleGrants } from '@/lib/permissions/catalog';

/**
 * The two checks every admin surface runs, in this order:
 *
 *   1. `requireAdmin`      — is there a live session, and is that email allowlisted?
 *   2. `requirePermission` — does that user's role grant this specific action?
 *
 * Both are first-line calls in a handler, before reading the body or touching the
 * database (PLAN.md §14h). The allowlist is checked on every request, not just at
 * sign-in, so removing an address from ADMIN_ALLOWLIST locks that person out on
 * their very next request rather than whenever their session happens to expire.
 */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  banned: boolean;
};

// Defined in lib/api/errors so that module can stay dependency-free; re-exported
// here because this is where callers expect it.
export { AuthError };

// Re-exported so callers have one import for "the admin guard", while the policy
// itself stays in a module that touches nothing.
export { adminAllowlist, isAllowlisted };

/** The signed-in admin, or null. Never throws — for pages that render either way. */
export async function getAdmin(request: Request): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user?.email) return null;
  if (!isAllowlisted(user.email)) return null;

  // A banned user keeps a valid cookie until it expires; check the row.
  const [row] = await db
    .select({ banned: authUser.banned })
    .from(authUser)
    .where(eq(authUser.id, user.id))
    .limit(1);
  if (row?.banned) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    image: user.image ?? null,
    banned: false,
  };
}

/** Throws AuthError(401) when there is no allowlisted, unbanned session. */
export async function requireAdmin(request: Request): Promise<AdminUser> {
  const admin = await getAdmin(request);
  if (!admin) throw new AuthError(401, 'Not authenticated');
  return admin;
}

/**
 * Every permission code the user holds, resolved through
 * `auth_user_roles → role_permissions → permissions`.
 *
 * The Owner role short-circuits to the whole catalog rather than reading grant
 * rows, so a permission added to the catalog is owned immediately and Owner can
 * never be locked out of a new feature by a forgotten sync.
 */
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

/**
 * Guard for an admin route handler. Returns the user so the handler can use it.
 *
 * Throws 401 when signed out or not allowlisted, 403 when signed in without the
 * permission — the distinction matters, because 403 tells an attacker the endpoint
 * exists while 401 does not, and only the former is a legitimate signal to send to
 * someone who has already proven who they are.
 */
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
