import { adminRoute } from '@/lib/api/handler';
import { listCurrencies } from '@/lib/services/currencies';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('currencies:view', async () => listCurrencies());
