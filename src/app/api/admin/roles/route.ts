import { adminRoute } from '@/lib/api/handler';
import { listRoles } from '@/lib/services/rbac';

// Read-only: roles are fixed in code (PLAN.md §3). There is no create, edit or
// delete, because there is no role editor — that was 421 lines guarding a
// decision a three-person team makes once.
export const dynamic = 'force-dynamic';

export const GET = adminRoute('users:view', async () => listRoles());
