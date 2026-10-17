import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18n = createMiddleware(routing);

const PROTECTED_BUYER_PATH_RE = /^\/(?:(en|tr|ar)\/)?(account|orders|cart)(?:\/|$)/;
const PRIVATE_NOINDEX_PATH_RE = /^\/(?:(en|tr|ar)\/)?(account|orders|cart|login)(?:\/|$)/;

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.endsWith('.session_token') && Boolean(cookie.value));
}

/**
 * Locale prefixing, canonical domain redirect, and edge auth guard for private buyer routes.
 */
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
    return NextResponse.next();
  }

  const protectedMatch = pathname.match(PROTECTED_BUYER_PATH_RE);
  if (protectedMatch && !hasSessionCookie(request)) {
    const locale = protectedMatch[1] ?? routing.defaultLocale;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl, 307);
    redirectResponse.headers.set('Cache-Control', 'private, no-store');
    redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return redirectResponse;
  }

  const response = handleI18n(request);
  if (PRIVATE_NOINDEX_PATH_RE.test(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  } else if (process.env.SITE_INDEXABLE !== 'true' || host.toLowerCase().startsWith('dev.')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return response;
}

export const config = {
  // Matches root, localized storefront paths, and root text files.
  matcher: ['/', '/(tr|ar|en)/:path*', '/(account|orders|cart|login)/:path*', '/:key.txt'],
};
