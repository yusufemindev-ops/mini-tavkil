import { db } from '@/lib/db';
import {
  accountRequests,
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
import { APIError } from 'better-auth/api';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Better Auth configuration for Google OAuth admin and admin-provisioned buyer authentication.
 * Initialized lazily on first access so Worker bindings hydrate `process.env` first.
 */
function createAuth() {
  return betterAuth({
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
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    // Expose buyer-safe fields in session payload; commercial fields (tierMarkupPercent) stay server-only.
    user: {
      additionalFields: {
        userType: { type: 'string', input: false, required: false },
        companyName: { type: 'string', input: false, required: false },
        contactName: { type: 'string', input: false, required: false },
        firstName: { type: 'string', input: false, required: false },
        lastName: { type: 'string', input: false, required: false },
        jobTitle: { type: 'string', input: false, required: false },
        phone: { type: 'string', input: false, required: false },
        country: { type: 'string', input: false, required: false },
        city: { type: 'string', input: false, required: false },
        address: { type: 'string', input: false, required: false },
        verified: { type: 'boolean', input: false, required: false },
        preferredLocale: { type: 'string', input: false, required: false },
      },
    },
    // Gate sign-up: only allowlisted/invited staff can auto-create on first login; buyers must be provisioned first.
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const staff = isAllowlisted(user.email) || (await invitedRoleFor(user.email)) !== null;
            if (!staff) {
              const email = user.email.trim().toLowerCase();
              const [pending] = await db
                .select({ id: accountRequests.id })
                .from(accountRequests)
                .where(
                  and(
                    sql`lower(${accountRequests.businessEmail}) = ${email}`,
                    eq(accountRequests.status, 'pending'),
                  ),
                )
                .limit(1);
              const code = pending ? 'REQUEST_PENDING' : 'BUYER_NOT_REGISTERED';
              throw new APIError('FORBIDDEN', { code, message: code });
            }
            return { data: { ...user, userType: 'admin' } };
          },
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
          before: async (session) => {
            const [row] = await db
              .select({ banned: authUser.banned })
              .from(authUser)
              .where(eq(authUser.id, session.userId))
              .limit(1);
            if (row?.banned) {
              throw new APIError('FORBIDDEN', { code: 'BANNED_USER', message: 'BANNED_USER' });
            }
          },
          after: async (session) => {
            await db
              .update(authUser)
              .set({ lastSeenAt: new Date().toISOString() })
              .where(eq(authUser.id, session.userId));
          },
        },
      },
    },
    onAPIError: { errorURL: '/en/login' },
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
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, property, receiver) {
    if (!instance) {
      instance = createAuth();
    }
    return Reflect.get(instance, property, receiver);
  },
});

export type Session = typeof auth.$Infer.Session;
