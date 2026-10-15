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
import { invitedRoleFor } from '@/lib/services/team';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';

/**
 * Better Auth configuration for Google OAuth admin authentication.
 * Email/password is disabled; access is gated via ADMIN_ALLOWLIST.
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
  trustedOrigins: process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : undefined,
  emailAndPassword: { enabled: false },
  // Expose userType in session payload; server-owned to prevent client tampering.
  user: {
    additionalFields: {
      userType: { type: 'string', input: false, required: false },
    },
  },
  // Assign initial userType and bootstrap roles via database hooks.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const staff = isAllowlisted(user.email) || (await invitedRoleFor(user.email)) !== null;
          return { data: { ...user, userType: staff ? 'admin' : 'buyer' } };
        },
        // Assign default role on first sign-in (Owner for allowlist, or invited role).
        after: async (user) => {
          const invited = await invitedRoleFor(user.email);
          const code = isAllowlisted(user.email) ? OWNER_ROLE : invited;
          if (!code) return;

          const [row] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.code, code))
            .limit(1);
          if (!row) return;
          await db
            .insert(authUserRoles)
            .values({ authUserId: user.id, roleId: row.id })
            .onConflictDoNothing();
        },
      },
    },
    session: {
      create: {
        // Update user's lastSeenAt timestamp on sign-in session creation.
        after: async (session) => {
          await db
            .update(authUser)
            .set({ lastSeenAt: new Date().toISOString() })
            .where(eq(authUser.id, session.userId));
        },
      },
    },
  },
  // Direct OAuth error redirects to admin login page.
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
    // HttpOnly, Secure, SameSite=Lax cookie session protection.
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
});

export type Session = typeof auth.$Infer.Session;
