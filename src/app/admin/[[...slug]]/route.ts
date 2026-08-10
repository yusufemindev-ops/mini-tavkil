import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAdmin } from '@/lib/auth-guard';
import { ADMIN_SHELL } from '@/generated/admin-shell';

/**
 * Serves the admin SPA, and is the reason `run_worker_first` exists in
 * wrangler.jsonc.
 *
 * Cloudflare answers static-asset requests *before* the Worker runs. With the SPA
 * built into public/admin, every /admin request used to be served straight from
 * the asset store and Next's middleware never executed — the gate was bypassed in
 * production while working perfectly under `next dev`, which has no asset layer.
 * Deep links 404'd for the same reason: no file exists at /admin/products and the
 * Worker was never asked.
 *
 * Routing /admin* to the Worker fixes the routes. The shell needed one more step:
 * while it was a file under public/ it stayed directly reachable no matter what
 * this handler did, so `pnpm admin:build` lifts it into a generated module and
 * deletes it from public/. Its assets stay public, which is right — they carry no
 * data and every visitor gets identical bytes.
 */
export const dynamic = 'force-dynamic';

// A path with a file extension is an asset request; anything else is a
// client-side route.
const LOOKS_LIKE_A_FILE = /\.[a-z0-9]+$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (LOOKS_LIKE_A_FILE.test(url.pathname)) {
    const assets = (
      getCloudflareContext().env as unknown as {
        ASSETS?: { fetch: (r: Request) => Promise<Response> };
      }
    ).ASSETS;
    // `next dev` has no asset binding and serves public/ itself, so this branch
    // only runs on the Worker.
    if (assets) return assets.fetch(request);
    return new Response('Not found', { status: 404 });
  }

  // The shell is gated. A signed-out visitor is redirected by the middleware;
  // this catches anyone who got past it with a forged cookie, and is a real
  // session check rather than the cookie-presence test middleware can afford.
  const admin = await getAdmin(request);
  if (!admin) {
    return Response.redirect(new URL('/sign-in?error=not-allowed', url.origin), 307);
  }

  return new Response(ADMIN_SHELL, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Never cache an authenticated shell at a shared layer.
      'Cache-Control': 'private, no-store',
    },
  });
}
