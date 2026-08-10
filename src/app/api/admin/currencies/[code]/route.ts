import { adminRoute } from '@/lib/api/handler';
import {
  setCurrencyActive,
  toggleCurrencySchema,
  type ToggleCurrencyInput,
} from '@/lib/services/currencies';

export const dynamic = 'force-dynamic';

export const PATCH = adminRoute<{ code: string }, ToggleCurrencyInput>(
  'currencies:edit',
  toggleCurrencySchema,
  async ({ params, body }) => setCurrencyActive(params.code, body.isActive),
);
