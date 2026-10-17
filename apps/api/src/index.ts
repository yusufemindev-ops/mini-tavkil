import type { ExecutionContext } from 'hono';
import { fxDbFromEnv, hasSucceededToday, refreshFxRates } from '@/lib/services/fx';
import { expireStaleOrders } from '@/lib/services/orders';
import { app } from '@/server/app';
import type { AppEnv } from '@/server/factory';

/**
 * Standalone Cloudflare Worker entrypoint for `api.tavkil.com` and `api-dev.tavkil.com`.
 * Serves all Hono `/api/*` routes and runs the scheduled FX / order-expiration Cron trigger.
 */
const worker = {
  fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext) {
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string' && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    _controller: { cron: string },
    env: AppEnv['Bindings'],
    ctx: { waitUntil: (p: Promise<unknown>) => void },
  ) {
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string' && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    if (!env.DATABASE_URL) {
      console.error('Cron: DATABASE_URL is not set; skipping scheduled tasks.');
      return;
    }

    ctx.waitUntil(
      (async () => {
        const db = fxDbFromEnv(env.DATABASE_URL!);

        const expiredCount = await expireStaleOrders(db).catch(() => 0);
        if (expiredCount > 0) {
          console.log(`Cron: Auto-expired ${expiredCount} stale order request(s).`);
        }

        if (await hasSucceededToday(db)) return;

        const result = await refreshFxRates(db);
        console.log(
          `Cron FX refresh: ${result.status}` +
            (result.source ? ` via ${result.source}` : '') +
            (result.error ? ` — ${result.error}` : ''),
        );
      })(),
    );
  },
};

export default worker;
