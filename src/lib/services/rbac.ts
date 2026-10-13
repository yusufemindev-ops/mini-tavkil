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
 * Admin users and RBAC role assignments. Roles are fixed in code.
 */

/** Accepts either role code or database roleId to resolve target role. */
export const assignRoleSchema = z
  .object({
    role: z.enum(ASSIGNABLE_ROLES as [RoleCode, ...RoleCode[]]).optional(),
    roleId: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.role || value.roleId, { message: 'Pick a role.' });
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

/** Shape matching admin dashboard team member row requirements. */
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  banned: boolean;
  role: { id: string; code: string; name: string } | null;
  status: 'active' | 'invited' | 'suspended';
  googleConnected: boolean;
  allowlisted: boolean;
  isYou: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

/** Normalizes timestamp strings without timezone offsets to UTC ISO. */
function asUtcIso(value: string | null): string | null {
  if (!value) return null;
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(value);
  return hasZone ? value : `${value.replace(' ', 'T')}Z`;
}

export async function listAdminUsers(viewerId?: string): Promise<AdminUserRow[]> {
  const invites = await listInvites();
  // Include both env allowlist and dashboard invitees.
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

  // Synthesize pending rows for invited members who have not yet signed in.
  const signedInEmails = new Set(staff.map((row) => row.email.toLowerCase()));
  const pending: AdminUserRow[] = invites
    .filter((invite) => !signedInEmails.has(invite.email.toLowerCase()))
    .map((invite) => ({
      id: `invite:${invite.email}`,
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

/** Assigns a single fixed role to a user. */
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

/** Returns all system roles with member counts and granted permissions. */
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

/** Resolves role id or code string to a validated RoleCode enum value. */
export async function roleCodeFromIdOrCode(value: string): Promise<RoleCode | null> {
  if ((ASSIGNABLE_ROLES as string[]).includes(value)) return value as RoleCode;
  const [row] = await db
    .select({ code: roles.code })
    .from(roles)
    .where(eq(roles.id, value))
    .limit(1);
  return row && (ASSIGNABLE_ROLES as string[]).includes(row.code) ? (row.code as RoleCode) : null;
}
