import { Hono } from 'hono';
import {
  listCurrencies,
  listFxRuns,
  setCurrencyActive,
  toggleCurrencySchema,
} from '@/lib/services/currencies';
import { refreshFxRates } from '@/lib/services/fx';
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminCurrenciesRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('currencies:view'), async (c) => {
    return adminJson(c, await listCurrencies());
  })
  .patch('/:code', requireAdminPerm('currencies:edit'), async (c) => {
    const body = await parseJson(c, toggleCurrencySchema);
    return adminJson(c, await setCurrencyActive(c.req.param('code'), body.isActive));
  });

export const adminFxRoutes = new Hono<AppEnv>()
  .get('/runs', requireAdminPerm('currencies:view'), async (c) => {
    return adminJson(c, await listFxRuns());
  })
  .post('/refresh', requireAdminPerm('currencies:refresh_fx'), async (c) => {
    return adminJson(c, await refreshFxRates());
  });
