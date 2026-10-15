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
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminUsersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('users:view'), async (c) => {
    return adminJson(c, await listAdminUsers(c.var.admin.id));
  })
  .post('/', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, createMemberSchema);
    await inviteMember(body, c.var.admin.id, roleCodeFromIdOrCode);
    const members = await listAdminUsers(c.var.admin.id);
    const wanted = body.email.trim().toLowerCase();
    return adminJson(
      c,
      members.find((member) => member.email.toLowerCase() === wanted) ?? members[0],
    );
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
    return adminJson(
      c,
      members.find((member) => member.email.toLowerCase() === wanted) ?? members[0],
    );
  })
  .patch('/:id/role', requireAdminPerm('users:assign_role'), async (c) => {
    const body = await parseJson(c, assignRoleSchema);
    const code = body.role ?? (await roleCodeFromIdOrCode(body.roleId!));
    if (!code) throw invalid('That role does not exist.');
    return adminJson(c, await assignRole(c.req.param('id'), code));
  })
  .delete('/:id/role', requireAdminPerm('users:assign_role'), async (c) => {
    return adminJson(c, await removeRole(c.req.param('id')));
  })
  .post('/:id/suspend', requireAdminPerm('users:edit'), async (c) => {
    return adminJson(c, await setUserSuspended(c.req.param('id'), true));
  })
  .post('/:id/reactivate', requireAdminPerm('users:edit'), async (c) => {
    return adminJson(c, await setUserSuspended(c.req.param('id'), false));
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
