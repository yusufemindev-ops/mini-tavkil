import { adminRoute } from '@/lib/api/handler';
import { permissionCatalog } from '@/lib/services/rbac';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('users:view', async () => permissionCatalog());
