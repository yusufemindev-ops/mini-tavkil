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
// `__Secure-` is added whenever the cookie is Secure, and Better Auth splits a
// cookie that grows past the browser's 4 KB limit into `.0`, `.1`, … chunks. The
// session token is small enough today that chunking never triggers, but if it
// ever did, an exact-name test would stop matching and bounce a signed-in admin
// back to /sign-in forever — a redirect loop is a bad price for a stricter regex
// on a check that is only a convenience.
const SESSION_COOKIE = /(^|;\s*)(__Secure-)?better-auth\.session_token(\.\d+)?=/;

// Anything under /admin whose last segment has a file extension is a build
// artefact of the SPA, not a route.
// .html is excluded: under /admin that can only be the SPA shell, which is
// gated like any other admin route.
const ADMIN_ASSET = /\.(?!html?$)[a-z0-9]+$/i;

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  /**
   * `www` is not a second site — send it to the apex.
   *
   * Both hostnames serving the same pages is a duplicate-content problem, and
   * every canonical, hreflang and sitemap URL here names the apex. Permanent
   * (308) rather than temporary, because unlike `/` — whose target depends on
   * Accept-Language and must never be cached — this destination is fixed, so a
   * browser and a crawler should both be allowed to remember it.
   *
   * The path and query ride along, so a link someone shared as
   * `www.tavkil.com/en/product/x` lands on the product rather than the homepage.
   */
  const host = request.headers.get('host') ?? '';
  if (host.toLowerCase().startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = 'https';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // IndexNow verification file. It has to live at `/<key>.txt`, which is a
  // dynamic segment at the app root — and `app/[key]/route.ts` collides with
  // `app/[locale]`, since Next forbids two different slug names at the same
  // level. Serving it here avoids the collision and keeps the key out of
  // `public/`, where a stale file would linger after the key was rotated.
  if (pathname.endsWith('.txt')) {
    const indexNowKey = process.env.INDEXNOW_API_KEY;
    if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
      return new NextResponse(indexNowKey, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    // Any other root .txt — llms.txt, llms-full.txt — is a real route. It must
    // NOT fall through to the i18n handler below, which would redirect
    // /llms.txt to /en/llms.txt and break both files. That is exactly what the
    // `/:key.txt` matcher caused when it was first added.
    return NextResponse.next();
  }

  // `/admin` lives outside `[locale]` — it is a staff surface, not a storefront
  // page. But a visitor arriving from `/en/...` naturally reaches for
  // `/en/admin`, and next-intl's matcher claims `/(tr|ar|en)/:path*`, so that URL
  // fell through to the i18n handler, found no route, and **404'd**. A 404 is the
  // worst possible answer here: it looks like the admin is broken rather than
  // like the address is wrong.
  const localePrefixed = pathname.match(/^\/(?:en|tr|ar)(\/admin(?:\/.*)?)$/);
  if (localePrefixed) {
    const url = request.nextUrl.clone();
    url.pathname = localePrefixed[1];
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin')) {
    // The SPA's own JS, CSS and fonts must not be gated. They carry no data — the
    // bundle is identical for every visitor — and redirecting them breaks the page
    // for a signed-in admin whose *first* request is an asset (a hard refresh, or
    // a cached shell re-fetching a chunk).
    if (ADMIN_ASSET.test(pathname)) return NextResponse.next();

    // `/admin/login` is the SPA's own login screen and must stay reachable while
    // signed out — that is the whole point of it.
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
  // `/:key.txt` is here only for the IndexNow verification file above.
  matcher: ['/', '/(tr|ar|en)/:path*', '/admin/:path*', '/:key.txt'],
};
