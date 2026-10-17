import { Hono } from 'hono';
import { invalid } from '@/lib/api/errors';
import {
  assertActorCanAssignRole,
  assignRole,
  assignRoleSchema,
  createCustomRole,
  createRoleSchema,
  deleteCustomRole,
  getRoleById,
  listAdminUsers,
  listRoles,
  permissionCatalog,
  removeRole,
  roleCodeFromIdOrCode,
  setUserSuspended,
  updateCustomRole,
  updateRoleSchema,
} from '@/lib/services/rbac';
import {
  createMemberSchema,
  inviteMember,
  listInvites,
  updateInvite,
  updateInviteRole,
  updateMemberSchema,
} from '@/lib/services/team';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

async function resolveInviteForActor(actorId: string, inviteEmail: string, nextRoleCode?: string) {
  const existing = (await listInvites()).find((i) => i.email.toLowerCase() === inviteEmail);
  const targetRole = nextRoleCode ?? existing?.role;
  if (targetRole) {
    await assertActorCanAssignRole(actorId, targetRole, existing?.role ?? null);
  }
}

export const adminUsersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('users:view'), async (c) => {
    return adminJson(c, await listAdminUsers(c.var.admin.id));
  })
  .post('/', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, createMemberSchema);
    const code = await roleCodeFromIdOrCode(body.roleId);
    if (!code) throw invalid('Select a valid role.');
    await assertActorCanAssignRole(c.var.admin.id, code);
    await inviteMember(body, c.var.admin.id, roleCodeFromIdOrCode);
    const members = await listAdminUsers(c.var.admin.id);
    const wanted = body.email.trim().toLowerCase();
    const invited = members.find((member) => member.email.toLowerCase() === wanted) ?? members[0];
    await auditAdmin(c, {
      action: 'user.invited',
      resourceType: 'user',
      resourceId: invited?.id ?? wanted,
      target: wanted,
      summary: `Invited team member ${wanted}`,
    });
    return adminJson(c, invited);
  })
  .patch('/:id', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, updateMemberSchema);
    const id = decodeURIComponent(c.req.param('id'));
    if (!id.startsWith('invite:')) {
      throw invalid(
        'Only invited members can be edited here. Once someone signs in, their name and email come from their Google account.',
      );
    }
    const inviteEmail = id.slice('invite:'.length).trim().toLowerCase();
    await resolveInviteForActor(c.var.admin.id, inviteEmail);
    await updateInvite(inviteEmail, body, c.var.admin.id);
    const members = await listAdminUsers(c.var.admin.id);
    const wanted = (body.email ?? inviteEmail).trim().toLowerCase();
    const updated = members.find((member) => member.email.toLowerCase() === wanted) ?? members[0];
    await auditAdmin(c, {
      action: 'user.updated',
      resourceType: 'user',
      resourceId: updated?.id ?? wanted,
      target: wanted,
      summary: `Updated invited member ${wanted}`,
    });
    return adminJson(c, updated);
  })
  .patch('/:id/role', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, assignRoleSchema);
    const code = await roleCodeFromIdOrCode((body.role ?? body.roleId)!);
    if (!code) throw invalid('That role does not exist.');
    const targetId = decodeURIComponent(c.req.param('id'));
    if (targetId.startsWith('invite:')) {
      const inviteEmail = targetId.slice('invite:'.length).trim().toLowerCase();
      await resolveInviteForActor(c.var.admin.id, inviteEmail, code);
      await updateInviteRole(inviteEmail, code, c.var.admin.id);
      const members = await listAdminUsers(c.var.admin.id);
      const updated =
        members.find((m) => m.email.toLowerCase() === inviteEmail.toLowerCase()) ?? members[0];
      await auditAdmin(c, {
        action: 'user.role_assigned',
        resourceType: 'user',
        resourceId: targetId,
        target: inviteEmail,
        summary: `Assigned role "${code}" to invited member ${inviteEmail}`,
      });
      return adminJson(c, updated);
    }
    const updated = await assignRole(targetId, code, c.var.admin.id);
    await auditAdmin(c, {
      action: 'user.role_assigned',
      resourceType: 'user',
      resourceId: targetId,
      target: updated.email,
      summary: `Assigned role "${code}" to ${updated.email}`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id/role', requireAdminPerm('users:assign_role'), async (c) => {
    const targetId = c.req.param('id');
    const updated = await removeRole(targetId, c.var.admin.id);
    await auditAdmin(c, {
      action: 'user.role_revoked',
      resourceType: 'user',
      resourceId: targetId,
      target: updated.email,
      summary: `Revoked role from ${updated.email}`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/suspend', requireAdminPerm('users:edit'), async (c) => {
    const targetId = c.req.param('id');
    const updated = await setUserSuspended(targetId, true, c.var.admin.id);
    await auditAdmin(c, {
      action: 'user.suspended',
      resourceType: 'user',
      resourceId: targetId,
      target: updated.email,
      summary: `Suspended member ${updated.email}`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/reactivate', requireAdminPerm('users:edit'), async (c) => {
    const targetId = c.req.param('id');
    const updated = await setUserSuspended(targetId, false, c.var.admin.id);
    await auditAdmin(c, {
      action: 'user.reactivated',
      resourceType: 'user',
      resourceId: targetId,
      target: updated.email,
      summary: `Reactivated member ${updated.email}`,
    });
    return adminJson(c, updated);
  });

export const adminRolesRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('users:view'), async (c) => adminJson(c, await listRoles()))
  .get('/:id', requireAdminPerm('users:view'), async (c) =>
    adminJson(c, await getRoleById(c.req.param('id'))),
  )
  .post('/', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, createRoleSchema);
    const created = await createCustomRole(body, c.var.admin.id);
    await auditAdmin(c, {
      action: 'role.created',
      resourceType: 'user',
      resourceId: created.id,
      target: created.name,
      summary: `Created custom role "${created.name}" (${created.permissions.length} permissions)`,
    });
    return adminJson(c, created, 201);
  })
  .patch('/:id', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, updateRoleSchema);
    const updated = await updateCustomRole(c.req.param('id'), body, c.var.admin.id);
    await auditAdmin(c, {
      action: 'role.updated',
      resourceType: 'user',
      resourceId: updated.id,
      target: updated.name,
      summary: `Updated custom role "${updated.name}" (${updated.permissions.length} permissions)`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id', requireAdminPerm('users:assign_role'), async (c) => {
    const deleted = await deleteCustomRole(c.req.param('id'), c.var.admin.id);
    await auditAdmin(c, {
      action: 'role.deleted',
      resourceType: 'user',
      resourceId: deleted.id,
      target: deleted.name,
      summary: `Deleted custom role "${deleted.name}"`,
    });
    return adminJson(c, { id: deleted.id });
  });

export const adminPermissionsRoutes = new Hono<AppEnv>().get(
  '/catalog',
  requireAdminPerm('users:view'),
  async (c) => adminJson(c, permissionCatalog()),
);
