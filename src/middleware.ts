import createMiddleware from 'next-intl/middleware';
import { type NextRequest, type NextResponse } from 'next/server';
import { routing } from './i18n/routing';

// Locale detection + prefixing, and nothing else.
//
// Tavkil's middleware also gated buyer-only routes on a live session. There are
// no buyer accounts here, so all of that is gone; the only auth boundary is
// /admin and /api/admin, which step 7 adds.
const handleI18n = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  return handleI18n(request);
}

export const config = {
  matcher: ['/', '/(tr|ar|en)/:path*'],
};
