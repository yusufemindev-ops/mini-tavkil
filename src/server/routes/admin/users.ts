import { Hono } from 'hono';
import { invalid } from '@/lib/api/errors';
import {
  assignRole,
  assignRoleSchema,
  listAdminUsers,
  listRoles,
  permissionCatalog,
  removeRole,
  roleCodeFromIdOrCode,
  setUserSuspended,
} from '@/lib/services/rbac';
import {
  createMemberSchema,
  inviteMember,
  updateInvite,
  updateMemberSchema,
} from '@/lib/services/team';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminUsersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('users:view'), async (c) => {
    return adminJson(c, await listAdminUsers(c.var.admin.id));
  })
  .post('/', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, createMemberSchema);
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
    await updateInvite(id.slice('invite:'.length), body, c.var.admin.id);
    const members = await listAdminUsers(c.var.admin.id);
    const wanted = (body.email ?? id.slice('invite:'.length)).trim().toLowerCase();
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
    const code = body.role ?? (await roleCodeFromIdOrCode(body.roleId!));
    if (!code) throw invalid('That role does not exist.');
    const targetId = c.req.param('id');
    const updated = await assignRole(targetId, code);
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
    const updated = await removeRole(targetId);
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
    const updated = await setUserSuspended(targetId, true);
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
    const updated = await setUserSuspended(targetId, false);
    await auditAdmin(c, {
      action: 'user.reactivated',
      resourceType: 'user',
      resourceId: targetId,
      target: updated.email,
      summary: `Reactivated member ${updated.email}`,
    });
    return adminJson(c, updated);
  });

export const adminRolesRoutes = new Hono<AppEnv>().get(
  '/',
  requireAdminPerm('users:view'),
  async (c) => adminJson(c, await listRoles()),
);

export const adminPermissionsRoutes = new Hono<AppEnv>().get(
  '/catalog',
  requireAdminPerm('users:view'),
  async (c) => adminJson(c, await permissionCatalog()),
);
