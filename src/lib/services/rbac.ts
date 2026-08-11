import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authAccount, authUser, authUserRoles, roles } from '@/lib/db/schema';
import { invalid, notFound } from '@/lib/api/errors';
import { adminAllowlist } from '@/lib/permissions/allowlist';
import {
  ASSIGNABLE_ROLES,
  OWNER_ROLE,
  PERMISSION_CATALOG,
  ROLE_LABELS,
  roleGrants,
  type RoleCode,
} from '@/lib/permissions/catalog';

/**
 * Admin users and roles.
 *
 * This is where PLAN.md §3's "simplify machinery, never capability" bites hardest.
 * Tavkil had 1078 lines of UI over a role editor with a permission checkbox grid
 * and custom roles. That editor is gone: there are three roles, fixed in code, and
 * this module only assigns them.
 *
 * The model underneath is unchanged — `roles`, `permissions`, `role_permissions`
 * and `auth_user_roles` all still exist and are all still enforced. What was
 * deleted is the ability to *edit* them at runtime, which for a three-person team
 * was a large surface guarding a decision nobody makes twice.
 */

export const assignRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES as [RoleCode, ...RoleCode[]]),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

/**
 * Tavkil's `AdminTeamMember`, matched field for field — see
 * `admin/src/features/users/queries.ts`. The users page is Tavkil's and indexes
 * `STATUS_BADGE[member.status]`, so a row without `status` produced
 * `undefined.variant` and the whole page rendered blank with an uncaught
 * TypeError. `role.name` is read directly too; we were sending `role.label`.
 */
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  banned: boolean;
  /** Null when allowlisted but never assigned a role — they can do nothing. */
  role: { id: string; code: string; name: string } | null;
  /**
   * `suspended` when banned, `invited` when allowlisted but never signed in, else
   * `active`. There is no invitation flow here (access is the allowlist), so
   * `invited` means "cleared to sign in but has not yet".
   */
  status: 'active' | 'invited' | 'suspended';
  googleConnected: boolean;
  /** False when the row exists but the address is no longer on the allowlist. */
  allowlisted: boolean;
  isYou: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

/**
 * Every admin account.
 *
 * Includes users whose address has since been removed from `ADMIN_ALLOWLIST`,
 * flagged rather than hidden: they still have a row and a role, and knowing the
 * allowlist is what is actually blocking them beats wondering where they went.
 */
export async function listAdminUsers(viewerId?: string): Promise<AdminUserRow[]> {
  const allowed = new Set(adminAllowlist());

  const rows = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      image: authUser.image,
      banned: authUser.banned,
      lastSeenAt: authUser.lastSeenAt,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(asc(authUser.createdAt));

  // Only accounts that are, or once were, staff. A row for someone who never had
  // admin access is noise in this list.
  const staff = rows.filter((row) => allowed.has(row.email.toLowerCase()));
  const ids = staff.map((row) => row.id);

  const assignments =
    ids.length === 0
      ? []
      : await db
          .select({ userId: authUserRoles.authUserId, code: roles.code, roleId: roles.id })
          .from(authUserRoles)
          .innerJoin(roles, eq(roles.id, authUserRoles.roleId))
          .where(inArray(authUserRoles.authUserId, ids));

  const roleByUser = new Map(assignments.map((row) => [row.userId, row.code]));
  const roleIdByCode = new Map(assignments.map((row) => [row.code, row.roleId]));

  // Which accounts have a Google identity linked. The users table shows this as a
  // column, and it is the only sign-in method here, so it doubles as "can this
  // person actually get in".
  const googleLinked = new Set(
    ids.length === 0
      ? []
      : (
          await db
            .select({ userId: authAccount.userId })
            .from(authAccount)
            .where(and(inArray(authAccount.userId, ids), eq(authAccount.providerId, 'google')))
        ).map((row) => row.userId),
  );

  return staff.map((row) => {
    const code = roleByUser.get(row.id);
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      firstName: row.name?.split(/\s+/)[0] ?? null,
      lastName: row.name?.split(/\s+/).slice(1).join(' ') || null,
      banned: row.banned ?? false,
      role: code
        ? { id: roleIdByCode.get(code) ?? code, code, name: ROLE_LABELS[code as RoleCode] ?? code }
        : null,
      status: row.banned
        ? ('suspended' as const)
        : row.lastSeenAt
          ? ('active' as const)
          : ('invited' as const),
      googleConnected: googleLinked.has(row.id),
      allowlisted: allowed.has(row.email.toLowerCase()),
      isYou: row.id === viewerId,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
    };
  });
}

/**
 * Assign a role, replacing whatever the user held.
 *
 * One role per user, deliberately. Tavkil allowed several and then had to union
 * their grants; with three fixed roles that only creates the question "what does
 * Owner + Viewer mean?", which has no useful answer.
 */
export async function assignRole(userId: string, role: RoleCode): Promise<AdminUserRow> {
  const [user] = await db
    .select({ id: authUser.id, email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);
  if (!user) throw notFound('User not found.');

  const [target] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, role))
    .limit(1);
  if (!target)
    throw notFound(`Role "${role}" is not present in the database — run pnpm sync:permissions.`);

  await db.delete(authUserRoles).where(eq(authUserRoles.authUserId, userId));
  await db.insert(authUserRoles).values({ authUserId: userId, roleId: target.id });

  const updated = (await listAdminUsers()).find((row) => row.id === userId);
  if (!updated) throw notFound('User not found.');
  return updated;
}

/**
 * Suspend or reactivate an admin.
 *
 * Refuses to suspend the last active Owner. Locking every owner out of an admin
 * whose only escape hatch is the admin itself is unrecoverable without database
 * access.
 */
export async function setUserSuspended(userId: string, banned: boolean): Promise<AdminUserRow> {
  const users = await listAdminUsers();
  const target = users.find((row) => row.id === userId);
  if (!target) throw notFound('User not found.');

  if (banned && target.role?.code === OWNER_ROLE) {
    const activeOwners = users.filter(
      (row) => row.role?.code === OWNER_ROLE && !row.banned && row.allowlisted,
    );
    if (activeOwners.length <= 1) {
      throw invalid('Cannot suspend the last active owner.');
    }
  }

  await db
    .update(authUser)
    .set({ banned, updatedAt: new Date().toISOString() })
    .where(eq(authUser.id, userId));

  const updated = (await listAdminUsers()).find((row) => row.id === userId);
  if (!updated) throw notFound('User not found.');
  return updated;
}

/** Remove a user's role. They keep their account but can do nothing. */
export async function removeRole(userId: string): Promise<AdminUserRow> {
  const users = await listAdminUsers();
  const target = users.find((row) => row.id === userId);
  if (!target) throw notFound('User not found.');

  if (target.role?.code === OWNER_ROLE) {
    const activeOwners = users.filter(
      (row) => row.role?.code === OWNER_ROLE && !row.banned && row.allowlisted,
    );
    if (activeOwners.length <= 1) throw invalid('Cannot remove the last active owner.');
  }

  await db.delete(authUserRoles).where(and(eq(authUserRoles.authUserId, userId)));
  const updated = (await listAdminUsers()).find((row) => row.id === userId);
  if (!updated) throw notFound('User not found.');
  return updated;
}

/** The three fixed roles and what each holds. Read-only — there is no editor. */
export function listRoles() {
  return ASSIGNABLE_ROLES.map((code) => ({
    code,
    label: ROLE_LABELS[code],
    isOwner: code === OWNER_ROLE,
    permissions: [...roleGrants(code)].sort(),
  }));
}

/** The permission catalog, grouped by domain, for the admin's roles screen. */
export function permissionCatalog() {
  const byDomain = new Map<string, typeof PERMISSION_CATALOG>();
  for (const permission of PERMISSION_CATALOG) {
    byDomain.set(permission.domain, [...(byDomain.get(permission.domain) ?? []), permission]);
  }
  return [...byDomain.entries()].map(([domain, permissions]) => ({ domain, permissions }));
}
