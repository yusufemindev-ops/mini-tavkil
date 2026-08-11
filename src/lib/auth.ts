import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import { authAccount, authSession, authUser, authVerification } from '@/lib/db/schema';
import { isAllowlisted } from '@/lib/permissions/allowlist';

/**
 * Better Auth, Google only, admins only.
 *
 * There is no buyer sign-in on this site (PLAN.md §3), so this exists purely to
 * gate `/admin` and `/api/admin/*`. Two consequences worth stating:
 *
 *   - `emailAndPassword` is off. Every account is a Google account, so there is no
 *     password to leak, no reset flow to abuse, and no credential stuffing surface.
 *   - Sign-up is not open. Passing the Google flow is necessary but not sufficient;
 *     `ADMIN_ALLOWLIST` decides who actually gets in, and that check lives in
 *     auth-guard.ts so it applies to pages and API routes alike.
 *
 * The table names are Tavkil's (`authUser`, not `user`), so the adapter is given an
 * explicit schema map rather than relying on Better Auth's defaults. Those tables
 * already exist — do not create new ones.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: false },
  /**
   * Stamp `userType` on the row, because the admin SPA reads it.
   *
   * Tavkil's Nest backend set this at signup and its dashboard gates on it —
   * `features/auth/me-api.ts` throws `unauthorized` unless the session user is
   * `userType: 'admin'`, which sends the SPA to its own /login. The column
   * defaults to `'buyer'`, so every Google sign-in here produced a valid session
   * that the dashboard then rejected: sign in, land on /admin/dashboard, bounce
   * straight back to the login screen.
   *
   * Setting it from the allowlist keeps that ported check meaningful instead of
   * deleting it. It is not the security boundary — `requireAdmin()` re-reads
   * ADMIN_ALLOWLIST on every request, so a stale `'admin'` here grants nothing.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, userType: isAllowlisted(user.email) ? 'admin' : 'buyer' },
        }),
      },
    },
  },
  // Where a failed OAuth round-trip lands. Without this, Better Auth redirects to
  // its own /api/auth/error, which redirects to `/`, which the i18n middleware
  // then rewrites to `/en?error=…` — so a failed sign-in dropped the admin on the
  // storefront homepage with the reason hidden in a query string nothing reads.
  // Sending it to /admin/login puts the message on the page that can act on it.
  onAPIError: { errorURL: '/admin/login' },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    // Cookies must be Secure + HttpOnly + SameSite=Lax and never readable from
    // JavaScript (PLAN.md §14h). Session state never goes in localStorage.
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
});

export type Session = typeof auth.$Infer.Session;
