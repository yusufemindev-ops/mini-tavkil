import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authAccount, authUser, authUserRoles, roles } from '@/lib/db/schema';
import { invalid, notFound } from '@/lib/api/errors';
import { adminAllowlist } from '@/lib/permissions/allowlist';
import { listInvites } from '@/lib/services/team';
import {
  ASSIGNABLE_ROLES,
  OWNER_ROLE,
  PERMISSION_CATALOG,
  ROLE_DESCRIPTIONS,
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

/**
 * The SPA sends `{ roleId }` — the role's database id — while a human calling the
 * API by hand naturally sends `{ role: 'catalog_manager' }`. Accept both and
 * resolve to a code, rather than making the dashboard wrong or the API awkward.
 */
export const assignRoleSchema = z
  .object({
    role: z.enum(ASSIGNABLE_ROLES as [RoleCode, ...RoleCode[]]).optional(),
    roleId: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.role || value.roleId, { message: 'Pick a role.' });
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
/**
 * Stamp a naive timestamp as UTC.
 *
 * `lastSeenAt` is a Postgres `timestamp` (no time zone) read in `mode: 'string'`,
 * so it arrives as `2026-08-12 11:08:50.341` — no `Z`, no offset. `new Date()` in
 * the browser reads that as *local* time, so in UTC+3 the dashboard reported an
 * admin's last activity three hours earlier than it happened: someone signed in,
 * refreshed, and was told they had last been seen three hours ago.
 *
 * The stored value is UTC (it is written from `toISOString()`), so the only thing
 * missing was saying so. Done at the boundary rather than by migrating the column,
 * because a migration here is a deliberate act with no staging behind it
 * (CLAUDE.md §8) and this fixes the whole class of it for every consumer.
 */
function asUtcIso(value: string | null): string | null {
  if (!value) return null;
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(value);
  return hasZone ? value : `${value.replace(' ', 'T')}Z`;
}

export async function listAdminUsers(viewerId?: string): Promise<AdminUserRow[]> {
  const invites = await listInvites();
  // Both sources of access: the env allowlist that bootstraps owners, and people
  // invited from this very page. Listing only the former meant a colleague you
  // had just added did not appear at all.
  const allowed = new Set([...adminAllowlist(), ...invites.map((i) => i.email.toLowerCase())]);

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

  /**
   * Every role's database id, read from `roles` rather than from the assignments
   * above.
   *
   * Deriving it from assignments only knows about roles somebody already holds,
   * and an invited member holds none — so their `role.id` fell back to the role
   * *code*. The drawer's `<SelectMenu>` keys its options on the role id, nothing
   * matched, and "Manage member" showed an empty Role box over a row the table
   * had just labelled "Catalog manager".
   */
  const allRoles = await db.select({ id: roles.id, code: roles.code }).from(roles);
  const roleIdByCode = new Map(allRoles.map((row) => [row.code, row.id]));

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

  // Invited but not yet signed in — no authUser row exists, so synthesise one.
  // Otherwise "Add member" appeared to do nothing until they logged in.
  const signedInEmails = new Set(staff.map((row) => row.email.toLowerCase()));
  const pending: AdminUserRow[] = invites
    .filter((invite) => !signedInEmails.has(invite.email.toLowerCase()))
    .map((invite) => ({
      id: `invite:${invite.email}`,
      // The address as it was typed; `invite.email` is the lowercased match key.
      email: invite.displayEmail ?? invite.email,
      name: `${invite.firstName} ${invite.lastName}`.trim() || invite.email,
      firstName: invite.firstName || null,
      lastName: invite.lastName || null,
      image: null,
      banned: false,
      role: {
        id: roleIdByCode.get(invite.role) ?? invite.role,
        code: invite.role,
        name: ROLE_LABELS[invite.role] ?? invite.role,
      },
      status: 'invited' as const,
      googleConnected: false,
      allowlisted: true,
      isYou: false,
      lastSeenAt: null,
      createdAt: invite.invitedAt,
    }));

  const existing = staff.map((row) => {
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
      lastSeenAt: asUtcIso(row.lastSeenAt),
      createdAt: row.createdAt,
    };
  });

  return [...existing, ...pending];
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
/**
 * Tavkil's `AdminRole` shape — see `admin/src/features/users/queries.ts`.
 *
 * The users page renders each option as `role.name` keyed on `role.id`. We were
 * returning `{ code, label, isOwner }`, so every entry in the "Add member" Role
 * dropdown rendered blank: the list was the right length and completely unusable.
 *
 * `id` is the database row id where one exists, because assigning a role writes
 * `auth_user_roles.role_id`. `type` is always 'system': roles are fixed in code
 * here and there is no role editor (CLAUDE.md §6), so none of them are custom.
 */
export async function listRoles(): Promise<AdminRole[]> {
  const [rows, counts] = await Promise.all([
    db.select({ id: roles.id, code: roles.code }).from(roles),
    db
      .select({ roleId: authUserRoles.roleId, n: count() })
      .from(authUserRoles)
      .groupBy(authUserRoles.roleId),
  ]);
  const idByCode = new Map(rows.map((row) => [row.code, row.id]));
  const countById = new Map(counts.map((row) => [row.roleId, Number(row.n)]));

  return ASSIGNABLE_ROLES.map((code) => {
    const id = idByCode.get(code) ?? code;
    return {
      id,
      code,
      name: ROLE_LABELS[code],
      description: ROLE_DESCRIPTIONS[code] ?? null,
      type: 'system' as const,
      memberCount: countById.get(id) ?? 0,
      permissions: [...roleGrants(code)].sort(),
    };
  });
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'system';
  memberCount: number;
  permissions: string[];
}

/** The permission catalog, grouped by domain, for the admin's roles screen. */
export function permissionCatalog() {
  const byDomain = new Map<string, typeof PERMISSION_CATALOG>();
  for (const permission of PERMISSION_CATALOG) {
    byDomain.set(permission.domain, [...(byDomain.get(permission.domain) ?? []), permission]);
  }
  return [...byDomain.entries()].map(([domain, permissions]) => ({ domain, permissions }));
}

/**
 * Resolve a role's database id OR its code to a code.
 *
 * Reads the table rather than a module-level cache. A cache warmed by
 * `listRoles()` looked fine locally and failed in production: Workers do not
 * share module state between invocations, so the request that POSTed a new
 * member ran in a cold isolate, the map was empty, and every add was rejected
 * with "That role does not exist." Three rows, one indexed lookup — the cache
 * was never worth it.
 */
export async function roleCodeFromIdOrCode(value: string): Promise<RoleCode | null> {
  if ((ASSIGNABLE_ROLES as string[]).includes(value)) return value as RoleCode;
  const [row] = await db
    .select({ code: roles.code })
    .from(roles)
    .where(eq(roles.id, value))
    .limit(1);
  return row && (ASSIGNABLE_ROLES as string[]).includes(row.code) ? (row.code as RoleCode) : null;
}
