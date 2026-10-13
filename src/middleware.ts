import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * Locale prefixing for the storefront, and a fast redirect gate for `/admin`.
 * Note: `/admin` cookie check is for redirect convenience; server handlers enforce real auth.
 */
// Matches Better Auth session cookie, including secure prefix and chunked cookies.
const SESSION_COOKIE = /(^|;\s*)(__Secure-)?better-auth\.session_token(\.\d+)?=/;

// Excludes static SPA assets under /admin (excluding .html shells).
const ADMIN_ASSET = /\.(?!html?$)[a-z0-9]+$/i;

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Canonicalize www to apex domain with permanent 308 redirect.
  const host = request.headers.get('host') ?? '';
  if (host.toLowerCase().startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = 'https';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // Serve root IndexNow verification key, bypassing i18n routing.
  if (pathname.endsWith('.txt')) {
    const indexNowKey = process.env.INDEXNOW_API_KEY;
    if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
      return new NextResponse(indexNowKey, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    // Allow root text files (e.g. llms.txt) to bypass i18n handler.
    return NextResponse.next();
  }

  // Redirect locale-prefixed admin paths (e.g. /en/admin) to /admin.
  const localePrefixed = pathname.match(/^\/(?:en|tr|ar)(\/admin(?:\/.*)?)$/);
  if (localePrefixed) {
    const url = request.nextUrl.clone();
    url.pathname = localePrefixed[1];
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin')) {
    // Bypass gating for static assets and public admin login route.
    if (ADMIN_ASSET.test(pathname)) return NextResponse.next();
    if (pathname === '/admin/login') return NextResponse.next();

    if (!SESSION_COOKIE.test(request.headers.get('cookie') ?? '')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return handleI18n(request);
}

export const config = {
  // Matches root, localized storefront paths, admin, and root text files.
  matcher: ['/', '/(tr|ar|en)/:path*', '/admin/:path*', '/:key.txt'],
};
