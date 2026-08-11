import { betterAuth } from 'better-auth';
import { eq } from 'drizzle-orm';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import {
  authAccount,
  authSession,
  authUser,
  authUserRoles,
  authVerification,
  roles,
} from '@/lib/db/schema';
import { isAllowlisted } from '@/lib/permissions/allowlist';
import { OWNER_ROLE } from '@/lib/permissions/catalog';

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
   * `userType` has to be DECLARED, not just written.
   *
   * Better Auth serialises only the columns it knows about into the session
   * payload. Writing `userType` to the row (see the create hook below) was not
   * enough: `authClient.getSession()` returned a user object without the field,
   * so the admin SPA's `user.userType !== 'admin'` test compared against
   * `undefined` and failed on every single load — sign in, land on the
   * dashboard, bounce back to login, forever.
   *
   * `input: false` keeps it server-owned: a client cannot send `userType` in a
   * sign-up or update payload and promote itself.
   */
  user: {
    additionalFields: {
      userType: { type: 'string', input: false, required: false },
    },
  },
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
        /**
         * Give an allowlisted admin the Owner role on first sign-in.
         *
         * Without this the project cannot be bootstrapped. `permissionsFor()`
         * reads `auth_user_roles`, which starts empty, so a brand-new admin
         * signs in with **zero** permissions and the SPA hides every nav item
         * but Dashboard. The only way to grant a role is the Users page, which
         * itself requires `users:assign_role` — nobody can ever hold it. That
         * deadlock is exactly what the first real sign-in hit.
         *
         * The allowlist is already the "who runs this site" list (CLAUDE.md §6),
         * so deriving Owner from it introduces no new authority: an address that
         * is not on it fails `requireAdmin()` on every request regardless of any
         * role row.
         */
        after: async (user) => {
          if (!isAllowlisted(user.email)) return;
          const [owner] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.code, OWNER_ROLE))
            .limit(1);
          if (!owner) return; // `pnpm sync:permissions` has not run yet.
          await db
            .insert(authUserRoles)
            .values({ authUserId: user.id, roleId: owner.id })
            .onConflictDoNothing();
        },
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
