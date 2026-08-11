import { adminRoute } from '@/lib/api/handler';
import { refreshFxRates } from '@/lib/services/fx';

// Settings' "Refresh now" — the same function the cron runs, on demand. It never
// throws, so a provider outage returns a recorded failed run rather than a 500.
export const dynamic = 'force-dynamic';

export const POST = adminRoute('currencies:refresh_fx', async () => refreshFxRates());
