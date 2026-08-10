import { adminRoute } from '@/lib/api/handler';
import { setUserSuspended } from '@/lib/services/rbac';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('users:edit', async ({ params }) =>
  setUserSuspended(params.id, false),
);
