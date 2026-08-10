import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * Two jobs: locale prefixing for the storefront, and a cheap gate in front of
 * `/admin`.
 *
 * The `/admin` check here is a **redirect convenience, not the security boundary**.
 * It only looks for the presence of a session cookie, which anyone can forge — its
 * job is to send a signed-out visitor to the sign-in page instead of a blank shell.
 * The real check is `requireAdmin()` / `requirePermission()` running server-side in
 * every page and every `/api/admin/*` handler, which validates the session against
 * the database and re-checks ADMIN_ALLOWLIST on every request.
 *
 * Doing it this way keeps a database round-trip off every asset request while
 * losing nothing: a forged cookie gets past this line and straight into a 401.
 */
const SESSION_COOKIE = /(^|;\s*)(__Secure-)?better-auth\.session_token=/;

// Anything under /admin whose last segment has a file extension is a build
// artefact of the SPA, not a route.
// .html is excluded: under /admin that can only be the SPA shell, which is
// gated like any other admin route.
const ADMIN_ASSET = /\.(?!html?$)[a-z0-9]+$/i;

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    // The SPA's own JS, CSS and fonts must not be gated. They carry no data — the
    // bundle is identical for every visitor — and redirecting them to /sign-in
    // breaks the page for a signed-in admin whose *first* request is an asset
    // (a hard refresh, or a cached shell re-fetching a chunk).
    if (ADMIN_ASSET.test(pathname)) return NextResponse.next();

    if (!SESSION_COOKIE.test(request.headers.get('cookie') ?? '')) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.search = '';
      // So sign-in can send them back where they were going.
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/', '/(tr|ar|en)/:path*', '/admin/:path*'],
};
