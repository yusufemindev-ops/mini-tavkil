import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revalidatePath } from 'next/cache';
import { registerRevalidator } from '@/lib/cache';
import { app } from '@/server/app';
import type { AppEnv } from '@/server/factory';

export const dynamic = 'force-dynamic';

registerRevalidator(revalidatePath);

function forward(req: Request) {
  let cfEnv: AppEnv['Bindings'] | undefined;
  try {
    cfEnv = getCloudflareContext().env as unknown as AppEnv['Bindings'];
  } catch {
    cfEnv = undefined;
  }
  return app.fetch(req, cfEnv);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
export const OPTIONS = forward;
