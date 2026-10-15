import { Hono } from 'hono';
import { permissionsFor, requireAdmin, rolesFor } from '@/lib/auth-guard';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type RoleCode } from '@/lib/permissions/catalog';
import { adminJson, type AppEnv } from '@/server/factory';

/** Returns the current admin identity, held permissions, and role metadata. */
export const adminMeRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const admin = await requireAdmin(c.req.raw);
  const [held, mine] = await Promise.all([permissionsFor(admin.id), rolesFor(admin.id)]);

  return adminJson(c, {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    image: admin.image,
    permissions: [...held].sort(),
    roles: ASSIGNABLE_ROLES.map((code) => ({ code, label: ROLE_LABELS[code] })),
    assignedRoles: mine
      .filter((code): code is RoleCode => code in ROLE_LABELS)
      .map((code) => ({ code, label: ROLE_LABELS[code] })),
  });
});
