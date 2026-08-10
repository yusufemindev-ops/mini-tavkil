import { adminRoute } from '@/lib/api/handler';
import { listAdminUsers } from '@/lib/services/rbac';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('users:view', async () => listAdminUsers());
