import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revalidatePath } from 'next/cache';
import { registerRevalidator } from '@/lib/cache';
import { app } from '@/server/app';
import type { AppEnv } from '@/server/factory';

export const dynamic = 'force-dynamic';

registerRevalidator(revalidatePath);

const PROD_STOREFRONT_HOSTS = new Set(['tavkil.com', 'www.tavkil.com', 'dev.tavkil.com']);

function forward(req: Request) {
  const url = new URL(req.url);
  if (
    PROD_STOREFRONT_HOSTS.has(url.hostname) &&
    (url.pathname === '/api/admin' ||
      url.pathname.startsWith('/api/admin/') ||
      url.pathname === '/api/docs' ||
      url.pathname === '/api/openapi.json')
  ) {
    return Response.json(
      { error: { code: 'resource.not_found', message: 'Endpoint not found.' } },
      { status: 404 },
    );
  }

  let cfEnv: AppEnv['Bindings'] | undefined;
  let cfCtx: Parameters<typeof app.fetch>[2];
  try {
    const ctx = getCloudflareContext();
    cfEnv = ctx.env as unknown as AppEnv['Bindings'];
    cfCtx = ctx.ctx as Parameters<typeof app.fetch>[2];
  } catch {
    cfEnv = undefined;
    cfCtx = undefined;
  }
  return app.fetch(req, cfEnv, cfCtx);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
export const OPTIONS = forward;
