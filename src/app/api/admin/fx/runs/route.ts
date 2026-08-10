import { adminRoute } from '@/lib/api/handler';
import { listFxRuns } from '@/lib/services/currencies';

// Read-only history. The refresh that writes these rows lands in step 12.
export const dynamic = 'force-dynamic';

export const GET = adminRoute('currencies:view', async () => listFxRuns());
