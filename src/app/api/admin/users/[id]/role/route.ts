import { adminRoute } from '@/lib/api/handler';
import {
  assignRole,
  assignRoleSchema,
  removeRole,
  type AssignRoleInput,
} from '@/lib/services/rbac';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = adminRoute<Params, AssignRoleInput>(
  'users:assign_role',
  assignRoleSchema,
  async ({ params, body }) => assignRole(params.id, body.role),
);

export const DELETE = adminRoute<Params>('users:assign_role', async ({ params }) =>
  removeRole(params.id),
);
