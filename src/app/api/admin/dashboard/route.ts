import { adminRoute } from '@/lib/api/handler';
import { dashboardSummary } from '@/lib/services/dashboard';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('products:view', async () => dashboardSummary());
