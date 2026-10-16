import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { authUser } from '@/lib/db/schema';
import { AuthError } from '@/lib/api/errors';

export interface BuyerProfilePublic {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  firstName: string;
  lastName: string;
  preferredLocale: string;
  phone: string | null;
  jobTitle: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  memberSince: string | null;
  verified: boolean;
}

export type BuyerSessionContext = BuyerProfilePublic;

const SEEN_WRITE_INTERVAL_MS = 5 * 60_000;

function asUtcIso(value: string | null): string | null {
  if (!value) return null;
  const hasZone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function touchBuyerLastSeen(userId: string, current: string | null): Promise<void> {
  if (current) {
    const iso = asUtcIso(current);
    const seen = iso ? Date.parse(iso) : NaN;
    if (Number.isFinite(seen) && Date.now() - seen < SEEN_WRITE_INTERVAL_MS) return;
  }
  await db
    .update(authUser)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(authUser.id, userId));
}

/** Resolves the signed-in buyer session or returns null when anonymous/non-buyer/banned. */
export async function getBuyerSession(request: Request): Promise<BuyerProfilePublic | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user?.id) return null;

  const [u] = await db.select().from(authUser).where(eq(authUser.id, user.id)).limit(1);

  if (!u || u.userType !== 'buyer' || u.banned) {
    return null;
  }

  await touchBuyerLastSeen(u.id, u.lastSeenAt);

  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();

  return {
    id: u.id,
    email: u.email,
    companyName: u.companyName ?? '',
    contactName: fullName || u.contactName || u.name || '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    preferredLocale: u.preferredLocale ?? 'en',
    phone: u.phone ?? null,
    jobTitle: u.jobTitle ?? null,
    country: u.country?.trim() || null,
    city: u.city ?? null,
    address: u.address ?? null,
    memberSince: asUtcIso(u.createdAt),
    verified: Boolean(u.verified),
  };
}

/** Throws AuthError(401) when there is no active buyer session. */
export async function requireBuyerSession(request: Request): Promise<BuyerProfilePublic> {
  const buyer = await getBuyerSession(request);
  if (!buyer) throw new AuthError(401, 'Sign in with a buyer account to continue.');
  return buyer;
}

/** Returns only public-safe buyer profile fields. */
export function toBuyerProfilePublic<T extends BuyerProfilePublic>(ctx: T): BuyerProfilePublic {
  return {
    id: ctx.id,
    email: ctx.email,
    companyName: ctx.companyName,
    contactName: ctx.contactName,
    firstName: ctx.firstName,
    lastName: ctx.lastName,
    preferredLocale: ctx.preferredLocale,
    phone: ctx.phone,
    jobTitle: ctx.jobTitle,
    country: ctx.country,
    city: ctx.city,
    address: ctx.address,
    memberSince: ctx.memberSince,
    verified: ctx.verified,
  };
}
