import { auth } from '@/lib/auth';

// Better Auth's own handler: sign-in, the Google OAuth callback, get-session,
// sign-out. Google's authorised redirect URI must be
// `<origin>/api/auth/callback/google`.
//
// `auth.handler` is a single (Request) => Response, so both verbs point at it
// rather than being destructured off it.
export const GET = auth.handler;
export const POST = auth.handler;
