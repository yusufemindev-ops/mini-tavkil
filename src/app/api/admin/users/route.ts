import { adminRoute } from '@/lib/api/handler';
import { listAdminUsers } from '@/lib/services/rbac';

export const dynamic = 'force-dynamic';

// `admin.id` so the table can mark the current user's own row (`isYou`) and
// disable actions against themselves.
export const GET = adminRoute('users:view', async ({ admin }) => listAdminUsers(admin.id));
