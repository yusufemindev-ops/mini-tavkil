import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * Locale prefixing and canonical domain redirect for the public storefront.
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

  const response = handleI18n(request);
  if (process.env.SITE_INDEXABLE !== 'true' || host.toLowerCase().startsWith('dev.')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return response;
}

export const config = {
  // Matches root, localized storefront paths, and root text files.
  matcher: ['/', '/(tr|ar|en)/:path*', '/:key.txt'],
};
