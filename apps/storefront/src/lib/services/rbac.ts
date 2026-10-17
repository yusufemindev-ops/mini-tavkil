import { and, asc, count, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  authAccount,
  authSession,
  authUser,
  authUserRoles,
  permissions,
  rolePermissions,
  roles,
} from '@/lib/db/schema';
import { AuthError, conflict, invalid, notFound } from '@/lib/api/errors';
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
import {
  assignRoleSchema,
  createRoleSchema,
  slugifyRoleCode,
  updateRoleSchema,
  type AssignRoleInput,
  type CreateRoleInput,
  type UpdateRoleInput,
} from './rbac-schema';

export {
  assignRoleSchema,
  createRoleSchema,
  slugifyRoleCode,
  updateRoleSchema,
  type AssignRoleInput,
  type CreateRoleInput,
  type UpdateRoleInput,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks whether the given user holds the system Owner (`super_admin`) role. */
export async function isOwnerUser(userId: string): Promise<boolean> {
  const assigned = await db
    .select({ code: roles.code })
    .from(authUserRoles)
    .innerJoin(roles, eq(roles.id, authUserRoles.roleId))
    .where(eq(authUserRoles.authUserId, userId));
  return assigned.some((row) => row.code === OWNER_ROLE);
}

/** Resolves all active permission codes held by an admin user. */
async function resolvedUserPermissions(userId: string): Promise<Set<string>> {
  const assigned = await db
    .select({ roleId: authUserRoles.roleId, code: roles.code })
    .from(authUserRoles)
    .innerJoin(roles, eq(roles.id, authUserRoles.roleId))
    .where(eq(authUserRoles.authUserId, userId));

  if (assigned.some((row) => row.code === OWNER_ROLE)) {
    return new Set(roleGrants(OWNER_ROLE));
  }

  const out = new Set<string>();
  for (const row of assigned) {
    if ((ASSIGNABLE_ROLES as string[]).includes(row.code)) {
      for (const perm of roleGrants(row.code as RoleCode)) out.add(perm);
    }
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

  for (const row of granted) out.add(row.code);
  return out;
}

/** Verifies the acting admin holds every permission they are attempting to grant. */
export async function assertActorGrantsPermissions(
  actorId: string,
  requestedPermissions: Iterable<string>,
): Promise<void> {
  if (await isOwnerUser(actorId)) return;
  const held = await resolvedUserPermissions(actorId);
  for (const perm of requestedPermissions) {
    if (!held.has(perm)) {
      throw new AuthError(403, `Cannot grant permission "${perm}" that you do not hold.`);
    }
  }
}

/** Prevents non-Owners from assigning/modifying Owner or roles exceeding their own permissions. */
export async function assertActorCanAssignRole(
  actorId: string,
  targetRoleCode: string,
  currentRoleCode?: string | null,
): Promise<void> {
  if (targetRoleCode === OWNER_ROLE || currentRoleCode === OWNER_ROLE) {
    if (!(await isOwnerUser(actorId))) {
      throw new AuthError(403, 'Only an Owner can assign or modify the Owner role.');
    }
    return;
  }
  if (await isOwnerUser(actorId)) return;

  if (currentRoleCode && currentRoleCode !== targetRoleCode) {
    await assertActorCanAssignRole(actorId, currentRoleCode);
  }

  if ((ASSIGNABLE_ROLES as string[]).includes(targetRoleCode)) {
    await assertActorGrantsPermissions(actorId, roleGrants(targetRoleCode as RoleCode));
    return;
  }

  const customPerms = await db
    .select({ code: permissions.code })
    .from(roles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(
      permissions,
      and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.deprecated, false)),
    )
    .where(eq(roles.code, targetRoleCode));

  await assertActorGrantsPermissions(
    actorId,
    customPerms.map((r) => r.code),
  );
}

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

function resolveRoleLabel(code: string, roleNameByCode: Map<string, string>): string {
  return (ROLE_LABELS as Record<string, string>)[code] ?? roleNameByCode.get(code) ?? code;
}

export async function listAdminUsers(viewerId?: string): Promise<AdminUserRow[]> {
  const invites = await listInvites();
  const allowed = new Set([...adminAllowlist(), ...invites.map((i) => i.email.toLowerCase())]);
  const allowedList = [...allowed];

  const staff =
    allowedList.length === 0
      ? []
      : await db
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
          .where(inArray(sql`lower(${authUser.email})`, allowedList))
          .orderBy(asc(authUser.createdAt))
          .limit(500);

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

  const allRoles = await db
    .select({ id: roles.id, code: roles.code, name: roles.name })
    .from(roles);
  const roleIdByCode = new Map(allRoles.map((row) => [row.code, row.id]));
  const roleNameByCode = new Map(allRoles.map((row) => [row.code, row.name]));

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
        name: resolveRoleLabel(invite.role, roleNameByCode),
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
        ? {
            id: roleIdByCode.get(code) ?? code,
            code,
            name: resolveRoleLabel(code, roleNameByCode),
          }
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

/** Assigns a single system or custom role to a user while protecting Owners and the last active Owner. */
export async function assignRole(
  userId: string,
  roleCode: string,
  actorId?: string,
): Promise<AdminUserRow> {
  if (actorId && actorId === userId) {
    throw invalid('You cannot change your own role.');
  }

  const users = await listAdminUsers();
  const current = users.find((row) => row.id === userId);
  if (!current) throw notFound('User not found.');

  if (actorId) {
    await assertActorCanAssignRole(actorId, roleCode, current.role?.code ?? null);
  }

  if (current.role?.code === OWNER_ROLE && roleCode !== OWNER_ROLE) {
    const activeOwners = users.filter(
      (row) => row.role?.code === OWNER_ROLE && !row.banned && row.allowlisted,
    );
    if (activeOwners.length <= 1) {
      throw invalid('Cannot demote the last active owner.');
    }
  }

  const [target] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode))
    .limit(1);
  if (!target) {
    throw notFound(`Role "${roleCode}" is not present in the database.`);
  }

  await db.batch([
    db.delete(authUserRoles).where(eq(authUserRoles.authUserId, userId)),
    db.insert(authUserRoles).values({ authUserId: userId, roleId: target.id }),
  ]);

  const updated = (await listAdminUsers()).find((row) => row.id === userId);
  if (!updated) throw notFound('User not found.');
  return updated;
}

/** Suspends or reactivates an admin while protecting Owners and revoking active sessions on suspend. */
export async function setUserSuspended(
  userId: string,
  banned: boolean,
  actorId?: string,
): Promise<AdminUserRow> {
  if (actorId && actorId === userId && banned) {
    throw invalid('You cannot suspend your own account.');
  }

  const users = await listAdminUsers();
  const target = users.find((row) => row.id === userId);
  if (!target) throw notFound('User not found.');

  if (actorId && target.role?.code) {
    if (target.role.code === OWNER_ROLE && !(await isOwnerUser(actorId))) {
      throw new AuthError(403, 'Only an Owner can suspend or reactivate an Owner.');
    }
    await assertActorCanAssignRole(actorId, target.role.code);
  }

  if (banned && target.role?.code === OWNER_ROLE) {
    const activeOwners = users.filter(
      (row) => row.role?.code === OWNER_ROLE && !row.banned && row.allowlisted,
    );
    if (activeOwners.length <= 1) {
      throw invalid('Cannot suspend the last active owner.');
    }
  }

  const now = new Date().toISOString();
  if (banned) {
    await db.batch([
      db.update(authUser).set({ banned: true, updatedAt: now }).where(eq(authUser.id, userId)),
      db.delete(authSession).where(eq(authSession.userId, userId)),
    ]);
  } else {
    await db.update(authUser).set({ banned: false, updatedAt: now }).where(eq(authUser.id, userId));
  }

  const updated = (await listAdminUsers()).find((row) => row.id === userId);
  if (!updated) throw notFound('User not found.');
  return updated;
}

/** Removes a user's role assignment while protecting Owners and refusing to remove the last active Owner. */
export async function removeRole(userId: string, actorId?: string): Promise<AdminUserRow> {
  if (actorId && actorId === userId) {
    throw invalid('You cannot remove your own role.');
  }

  const users = await listAdminUsers();
  const target = users.find((row) => row.id === userId);
  if (!target) throw notFound('User not found.');

  if (actorId && target.role?.code === OWNER_ROLE && !(await isOwnerUser(actorId))) {
    throw new AuthError(403, 'Only an Owner can remove the Owner role.');
  }

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

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'system' | 'custom';
  memberCount: number;
  permissions: string[];
}

/** Returns all system and custom roles with member counts and granted permissions. */
export async function listRoles(): Promise<AdminRole[]> {
  const [rows, counts, customGrants, invites] = await Promise.all([
    db
      .select({
        id: roles.id,
        code: roles.code,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .orderBy(asc(roles.createdAt)),
    db
      .select({ roleId: authUserRoles.roleId, n: count() })
      .from(authUserRoles)
      .groupBy(authUserRoles.roleId),
    db
      .select({ roleId: rolePermissions.roleId, code: permissions.code })
      .from(rolePermissions)
      .innerJoin(
        permissions,
        and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.deprecated, false)),
      ),
    listInvites(),
  ]);

  const inviteEmails = invites.map((inv) => inv.email.toLowerCase());
  const signedInUsers =
    inviteEmails.length === 0
      ? []
      : await db
          .select({ email: authUser.email })
          .from(authUser)
          .where(inArray(sql`lower(${authUser.email})`, inviteEmails))
          .limit(500);

  const signedInEmails = new Set(signedInUsers.map((u) => u.email.toLowerCase()));
  const inviteCountByCode = new Map<string, number>();
  for (const inv of invites) {
    if (!signedInEmails.has(inv.email.toLowerCase())) {
      inviteCountByCode.set(inv.role, (inviteCountByCode.get(inv.role) ?? 0) + 1);
    }
  }

  const rowByCode = new Map(rows.map((row) => [row.code, row]));
  const countById = new Map(counts.map((row) => [row.roleId, Number(row.n)]));
  const permsByRoleId = new Map<string, string[]>();
  for (const grant of customGrants) {
    const list = permsByRoleId.get(grant.roleId) ?? [];
    list.push(grant.code);
    permsByRoleId.set(grant.roleId, list);
  }

  const systemList: AdminRole[] = ASSIGNABLE_ROLES.map((code) => {
    const dbRow = rowByCode.get(code);
    const id = dbRow?.id ?? code;
    return {
      id,
      code,
      name: ROLE_LABELS[code],
      description: ROLE_DESCRIPTIONS[code] ?? dbRow?.description ?? null,
      type: 'system' as const,
      memberCount: (countById.get(id) ?? 0) + (inviteCountByCode.get(code) ?? 0),
      permissions: [...roleGrants(code)].sort(),
    };
  });

  const systemCodes = new Set<string>(ASSIGNABLE_ROLES);
  const customList: AdminRole[] = rows
    .filter((row) => !row.isSystem && !systemCodes.has(row.code))
    .map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      type: 'custom' as const,
      memberCount: (countById.get(row.id) ?? 0) + (inviteCountByCode.get(row.code) ?? 0),
      permissions: (permsByRoleId.get(row.id) ?? []).sort(),
    }));

  return [...systemList, ...customList];
}

/** Returns a single system or custom role by database UUID or role code. */
export async function getRoleById(roleIdOrCode: string): Promise<AdminRole> {
  const all = await listRoles();
  const found = all.find((r) => r.id === roleIdOrCode || r.code === roleIdOrCode);
  if (!found) throw notFound('Role not found.');
  return found;
}

async function resolveCatalogPermissionIds(codes: string[]): Promise<Map<string, string>> {
  const uniqueCodes = [...new Set(codes)];
  let existing = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions)
    .where(inArray(permissions.code, uniqueCodes));

  if (existing.length < uniqueCodes.length) {
    const existingSet = new Set(existing.map((r) => r.code));
    const missing = PERMISSION_CATALOG.filter(
      (def) => uniqueCodes.includes(def.code) && !existingSet.has(def.code),
    );
    if (missing.length > 0) {
      await db
        .insert(permissions)
        .values(
          missing.map((def) => ({
            code: def.code,
            domain: def.domain,
            name: def.name,
            description: def.description,
            deprecated: false,
          })),
        )
        .onConflictDoNothing();
      existing = await db
        .select({ id: permissions.id, code: permissions.code })
        .from(permissions)
        .where(inArray(permissions.code, uniqueCodes));
    }
  }

  return new Map(existing.map((row) => [row.code, row.id]));
}

/** Creates a new custom RBAC role and grants the selected catalog permissions. */
export async function createCustomRole(
  input: CreateRoleInput,
  actorId?: string,
): Promise<AdminRole> {
  const parsed = createRoleSchema.parse(input);
  const code = slugifyRoleCode(parsed.name);
  if (!code) {
    throw invalid('Role name must contain letters or numbers.');
  }
  if ((ASSIGNABLE_ROLES as string[]).includes(code)) {
    throw conflict('A system role with that name already exists.');
  }

  const uniqueCodes = [...new Set(parsed.permissions)].sort();
  if (actorId) {
    await assertActorGrantsPermissions(actorId, uniqueCodes);
  }

  const [conflictRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(or(eq(roles.code, code), sql`lower(${roles.name}) = ${parsed.name.toLowerCase()}`))
    .limit(1);
  if (conflictRow) {
    throw conflict('A role with that name already exists.');
  }

  const permIdByCode = await resolveCatalogPermissionIds(uniqueCodes);
  const now = new Date().toISOString();

  const [created] = await db
    .insert(roles)
    .values({
      code,
      name: parsed.name,
      description: parsed.description || null,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: roles.id,
      code: roles.code,
      name: roles.name,
      description: roles.description,
    });

  const grantValues = uniqueCodes
    .map((c) => permIdByCode.get(c))
    .filter((id): id is string => Boolean(id))
    .map((permissionId) => ({
      roleId: created.id,
      permissionId,
      grantedAt: now,
      grantedBy: actorId ?? null,
    }));

  if (grantValues.length > 0) {
    await db.insert(rolePermissions).values(grantValues).onConflictDoNothing();
  }

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    type: 'custom',
    memberCount: 0,
    permissions: uniqueCodes,
  };
}

/** Updates a custom RBAC role's metadata and permission grants. */
export async function updateCustomRole(
  roleId: string,
  input: UpdateRoleInput,
  actorId?: string,
): Promise<AdminRole> {
  if (!UUID_RE.test(roleId)) throw notFound('Role not found.');
  const parsed = updateRoleSchema.parse(input);

  const [existing] = await db
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
      description: roles.description,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!existing) throw notFound('Role not found.');
  if (existing.isSystem || (ASSIGNABLE_ROLES as string[]).includes(existing.code)) {
    throw invalid('System roles are fixed in code and cannot be modified.');
  }

  if (actorId) {
    await assertActorCanAssignRole(actorId, existing.code);
    if (parsed.permissions !== undefined) {
      await assertActorGrantsPermissions(actorId, parsed.permissions);
    }
  }

  if (parsed.name !== undefined) {
    const [duplicate] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(ne(roles.id, roleId), sql`lower(${roles.name}) = ${parsed.name.trim().toLowerCase()}`),
      )
      .limit(1);
    if (duplicate) {
      throw conflict('A role with that name already exists.');
    }
  }

  const now = new Date().toISOString();
  await db
    .update(roles)
    .set({
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
      updatedAt: now,
    })
    .where(eq(roles.id, roleId));

  if (parsed.permissions !== undefined) {
    const uniqueCodes = [...new Set(parsed.permissions)].sort();
    const permIdByCode = await resolveCatalogPermissionIds(uniqueCodes);
    const grantValues = uniqueCodes
      .map((c) => permIdByCode.get(c))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({
        roleId,
        permissionId,
        grantedAt: now,
        grantedBy: actorId ?? null,
      }));

    if (grantValues.length > 0) {
      await db.batch([
        db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId)),
        db.insert(rolePermissions).values(grantValues).onConflictDoNothing(),
      ]);
    } else {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    }
  }

  const updated = (await listRoles()).find((r) => r.id === roleId);
  if (!updated) throw notFound('Role not found.');
  return updated;
}

/** Deletes a custom RBAC role if it is not a system role and has no assigned members. */
export async function deleteCustomRole(
  roleId: string,
  actorId?: string,
): Promise<{ id: string; code: string; name: string }> {
  if (!UUID_RE.test(roleId)) throw notFound('Role not found.');

  const [existing] = await db
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!existing) throw notFound('Role not found.');
  if (existing.isSystem || (ASSIGNABLE_ROLES as string[]).includes(existing.code)) {
    throw invalid('System roles cannot be deleted.');
  }
  if (actorId) {
    await assertActorCanAssignRole(actorId, existing.code);
  }

  const [[assignmentCount], invites] = await Promise.all([
    db.select({ n: count() }).from(authUserRoles).where(eq(authUserRoles.roleId, roleId)),
    listInvites(),
  ]);

  const activeAssigned = Number(assignmentCount?.n ?? 0);
  const invitedAssigned = invites.filter((inv) => inv.role === existing.code).length;
  if (activeAssigned > 0 || invitedAssigned > 0) {
    throw conflict(
      'Cannot delete a role while members are assigned to it. Reassign those members first.',
    );
  }

  await db.delete(roles).where(eq(roles.id, roleId));
  return { id: existing.id, code: existing.code, name: existing.name };
}

/** The permission catalog, grouped by domain, for the admin's roles screen. */
export function permissionCatalog() {
  const byDomain = new Map<string, typeof PERMISSION_CATALOG>();
  for (const permission of PERMISSION_CATALOG) {
    if (permission.domain === 'self_profile') continue;
    byDomain.set(permission.domain, [...(byDomain.get(permission.domain) ?? []), permission]);
  }
  return [...byDomain.entries()].map(([domain, perms]) => ({
    domain,
    actions: perms.map((p) => ({
      action: p.code.split(':')[1] ?? p.code,
      code: p.code,
      name: p.name,
      description: p.description,
    })),
    permissions: perms,
  }));
}

/** Resolves role id or code string to a validated role code in the database. */
export async function roleCodeFromIdOrCode(value: string): Promise<string | null> {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((ASSIGNABLE_ROLES as string[]).includes(trimmed)) return trimmed as RoleCode;

  const isUuid = UUID_RE.test(trimmed);
  const [row] = await db
    .select({ code: roles.code })
    .from(roles)
    .where(isUuid ? or(eq(roles.id, trimmed), eq(roles.code, trimmed)) : eq(roles.code, trimmed))
    .limit(1);
  return row?.code ?? null;
}
