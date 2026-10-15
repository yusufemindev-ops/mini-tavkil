import { Hono } from 'hono';
import {
  listCurrencies,
  listFxRuns,
  setCurrencyActive,
  toggleCurrencySchema,
} from '@/lib/services/currencies';
import { refreshFxRates } from '@/lib/services/fx';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminCurrenciesRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('currencies:view'), async (c) => {
    return adminJson(c, await listCurrencies());
  })
  .patch('/:code', requireAdminPerm('currencies:edit'), async (c) => {
    const code = c.req.param('code').toUpperCase();
    const body = await parseJson(c, toggleCurrencySchema);
    const updated = await setCurrencyActive(code, body.isActive);
    await auditAdmin(c, {
      action: 'currency.updated',
      resourceType: 'currency',
      resourceId: code,
      target: code,
      summary: `${body.isActive ? 'Enabled' : 'Disabled'} currency ${code}`,
    });
    return adminJson(c, updated);
  });

export const adminFxRoutes = new Hono<AppEnv>()
  .get('/runs', requireAdminPerm('currencies:view'), async (c) => {
    return adminJson(c, await listFxRuns());
  })
  .post('/refresh', requireAdminPerm('currencies:refresh_fx'), async (c) => {
    const res = await refreshFxRates();
    await auditAdmin(c, {
      action: 'currency.fx_refreshed',
      resourceType: 'currency',
      target: 'FX rates',
      summary: 'Refreshed exchange rates on demand',
    });
    return adminJson(c, res);
  });
