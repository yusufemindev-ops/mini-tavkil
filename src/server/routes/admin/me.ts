import { Hono } from 'hono';
import { permissionsFor, requireAdmin, rolesFor } from '@/lib/auth-guard';
import { ROLE_LABELS } from '@/lib/permissions/catalog';
import { listRoles } from '@/lib/services/rbac';
import { adminJson, type AppEnv } from '@/server/factory';

/** Returns the current admin identity, held permissions, and role metadata. */
export const adminMeRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const admin = await requireAdmin(c.req.raw);
  const [held, mine, allRoles] = await Promise.all([
    permissionsFor(admin.id),
    rolesFor(admin.id),
    listRoles(),
  ]);
  const labelByCode = new Map<string, string>(allRoles.map((r) => [r.code, r.name]));

  return adminJson(c, {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    image: admin.image,
    permissions: [...held].sort(),
    roles: allRoles.map((r) => ({ code: r.code, label: r.name })),
    assignedRoles: mine.map((code) => ({
      code,
      label: (ROLE_LABELS as Record<string, string>)[code] ?? labelByCode.get(code) ?? code,
    })),
  });
});
