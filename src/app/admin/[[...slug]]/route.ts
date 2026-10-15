import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAdmin } from '@/lib/auth-guard';
import { ADMIN_SHELL } from '@/generated/admin-shell';

/**
 * Serves the admin SPA HTML shell or delegates static assets to Cloudflare ASSETS binding.
 * Enforces session authentication before serving protected admin routes.
 */
export const dynamic = 'force-dynamic';

// File extensions denote static assets; all other paths route to SPA shell.
const LOOKS_LIKE_A_FILE = /\.[a-z0-9]+$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (process.env.NODE_ENV === 'development') {
    const devPath =
      url.pathname === '/admin' || url.pathname === '/admin/' ? '/admin/dashboard' : url.pathname;
    return Response.redirect(new URL(`${devPath}${url.search}`, 'http://localhost:5173'), 307);
  }

  if (LOOKS_LIKE_A_FILE.test(url.pathname)) {
    const assets = (
      getCloudflareContext().env as unknown as {
        ASSETS?: { fetch: (r: Request) => Promise<Response> };
      }
    ).ASSETS;
    // Forward asset requests to Cloudflare ASSETS binding in Worker runtime.
    if (assets) return assets.fetch(request);
    return new Response('Not found', { status: 404 });
  }

  // Permit public access to login screen without session check.
  const isLoginScreen = url.pathname === '/admin/login';

  // Verify authenticated admin session for all protected admin routes.
  if (!isLoginScreen) {
    const admin = await getAdmin(request);
    if (!admin) {
      return Response.redirect(new URL('/admin/login?error=not-allowed', url.origin), 307);
    }
  }

  return new Response(ADMIN_SHELL, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Never cache an authenticated shell at a shared layer.
      'Cache-Control': 'private, no-store',
    },
  });
}
