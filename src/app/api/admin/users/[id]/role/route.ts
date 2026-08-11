import { adminRoute } from '@/lib/api/handler';
import {
  assignRole,
  assignRoleSchema,
  removeRole,
  roleCodeFromIdOrCode,
  type AssignRoleInput,
} from '@/lib/services/rbac';
import { invalid } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = adminRoute<Params, AssignRoleInput>(
  'users:assign_role',
  assignRoleSchema,
  async ({ params, body }) => {
    const code = body.role ?? (await roleCodeFromIdOrCode(body.roleId!));
    if (!code) throw invalid('That role does not exist.');
    return assignRole(params.id, code);
  },
);

export const DELETE = adminRoute<Params>('users:assign_role', async ({ params }) =>
  removeRole(params.id),
);
