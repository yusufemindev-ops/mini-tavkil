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
  const authUrl = process.env.BETTER_AUTH_URL ?? '';
  const isProdDomain = authUrl.startsWith('https://') && !authUrl.includes('localhost');
  const isDevSubdomain =
    authUrl.includes('-dev.tavkil.com') || authUrl.includes('//dev.tavkil.com');
  const storefrontOrigin =
    process.env.STOREFRONT_URL?.replace(/\/$/, '') ||
    (isProdDomain ? (isDevSubdomain ? 'https://dev.tavkil.com' : 'https://tavkil.com') : '');

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
    trustedOrigins: [
      'https://tavkil.com',
      'https://www.tavkil.com',
      'https://admin.tavkil.com',
      'https://dev.tavkil.com',
      'https://admin-dev.tavkil.com',
      ...(isProdDomain
        ? []
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8787']),
    ],
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
            const [u] = await db
              .update(authUser)
              .set({ lastSeenAt: new Date().toISOString() })
              .where(eq(authUser.id, session.userId))
              .returning({ email: authUser.email, userType: authUser.userType });
            if (!u) return;

            const invited = await invitedRoleFor(u.email);
            const code = isAllowlisted(u.email) ? OWNER_ROLE : invited;
            if (!code) return;

            if (u.userType !== 'admin') {
              await db
                .update(authUser)
                .set({ userType: 'admin' })
                .where(eq(authUser.id, session.userId));
            }
            const existingRoles = await db
              .select({ roleId: authUserRoles.roleId })
              .from(authUserRoles)
              .where(eq(authUserRoles.authUserId, session.userId))
              .limit(1);
            if (existingRoles.length === 0) {
              const [roleRow] = await db
                .select({ id: roles.id })
                .from(roles)
                .where(eq(roles.code, code))
                .limit(1);
              if (roleRow) {
                await db
                  .insert(authUserRoles)
                  .values({ authUserId: session.userId, roleId: roleRow.id })
                  .onConflictDoNothing();
              }
            }
          },
        },
      },
    },
    onAPIError: { errorURL: `${storefrontOrigin}/en/login` },
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
      ...(isDevSubdomain ? { cookiePrefix: 'tavkil-dev' } : {}),
      crossSubDomainCookies: {
        enabled: isProdDomain,
        domain: '.tavkil.com',
      },
      // HttpOnly, Secure, SameSite=Lax cookie session protection.
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProdDomain,
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
