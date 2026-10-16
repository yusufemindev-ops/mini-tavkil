import { and, count, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  accountRequests,
  authAccount,
  authSession,
  authUser,
  buyerProfiles,
  orderRequests,
} from '@/lib/db/schema';
import { conflict, notFound } from '@/lib/api/errors';
import type { CreateBuyerInput, UpdateBuyerInput } from '@/lib/services/buyers-schema';

export interface AdminBuyerRow {
  id: string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
  contactName: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  countryCode: string | null;
  city: string | null;
  address: string | null;
  tierMarkup: number;
  orders: number;
  status: 'active' | 'suspended';
  verified: boolean;
  googleConnected: boolean;
  hasActiveSession: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  notes: string | null;
}

export interface CreatedBuyer {
  id: string;
  email: string;
}

function asUtcIso(value: string | null): string | null {
  if (!value) return null;
  const hasZone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

type RawBuyerUser = typeof authUser.$inferSelect;

async function hydrateBuyers(users: RawBuyerUser[]): Promise<AdminBuyerRow[]> {
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);
  const nowIso = new Date().toISOString();

  const [profiles, googleAccounts, activeSessions, orderCounts] = await Promise.all([
    db.select().from(buyerProfiles).where(inArray(buyerProfiles.authUserId, ids)),
    db
      .select({ userId: authAccount.userId })
      .from(authAccount)
      .where(and(inArray(authAccount.userId, ids), eq(authAccount.providerId, 'google'))),
    db
      .select({ userId: authSession.userId })
      .from(authSession)
      .where(and(inArray(authSession.userId, ids), gt(authSession.expiresAt, nowIso))),
    db
      .select({ buyerId: orderRequests.buyerId, n: count() })
      .from(orderRequests)
      .where(and(inArray(orderRequests.buyerId, ids), isNull(orderRequests.deletedAt)))
      .groupBy(orderRequests.buyerId),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.authUserId, p]));
  const googleSet = new Set(googleAccounts.map((a) => a.userId));
  const sessionSet = new Set(activeSessions.map((s) => s.userId));
  const orderCountMap = new Map(orderCounts.map((o) => [o.buyerId, Number(o.n)]));

  return users.map((u) => {
    const profile = profileMap.get(u.id);
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return {
      id: u.id,
      company: u.companyName ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      contactName: fullName || u.contactName || u.name,
      email: u.email,
      jobTitle: u.jobTitle ?? null,
      phone: u.phone ?? null,
      countryCode: u.country ?? null,
      city: u.city ?? null,
      address: u.address ?? null,
      tierMarkup: profile ? Number(profile.tierMarkupPercent) : 0,
      orders: orderCountMap.get(u.id) ?? 0,
      status: u.banned ? 'suspended' : 'active',
      verified: Boolean(u.verified),
      googleConnected: googleSet.has(u.id),
      hasActiveSession: sessionSet.has(u.id),
      lastSeenAt: asUtcIso(u.lastSeenAt),
      createdAt: asUtcIso(u.createdAt) ?? u.createdAt,
      notes: profile?.notes ?? null,
    };
  });
}

export async function listBuyers(): Promise<AdminBuyerRow[]> {
  const users = await db
    .select()
    .from(authUser)
    .where(eq(authUser.userType, 'buyer'))
    .orderBy(desc(authUser.createdAt))
    .limit(500);
  return hydrateBuyers(users);
}

export async function getBuyer(id: string): Promise<AdminBuyerRow> {
  const [user] = await db
    .select()
    .from(authUser)
    .where(and(eq(authUser.id, id), eq(authUser.userType, 'buyer')))
    .limit(1);
  if (!user) throw notFound('Buyer not found.');
  const [hydrated] = await hydrateBuyers([user]);
  return hydrated!;
}

export async function createBuyer(input: CreateBuyerInput): Promise<CreatedBuyer> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(sql`lower(${authUser.email}) = ${email}`)
    .limit(1);

  if (existing) {
    throw conflict('An account with this email already exists.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const tierMarkup = String(input.tierMarkup ?? 0);

  await db.batch([
    db.insert(authUser).values({
      id,
      email,
      name: fullName,
      emailVerified: true,
      userType: 'buyer',
      firstName,
      lastName,
      contactName: fullName,
      companyName: input.companyName?.trim() || null,
      jobTitle: input.jobTitle?.trim() || null,
      phone: input.phone.trim(),
      country: input.country.trim().toUpperCase(),
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      banned: false,
      verified: true,
      createdAt: now,
      updatedAt: now,
    }),
    db
      .insert(buyerProfiles)
      .values({
        authUserId: id,
        tierMarkupPercent: tierMarkup,
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: buyerProfiles.authUserId,
        set: {
          tierMarkupPercent: tierMarkup,
          notes: input.notes?.trim() || null,
          updatedAt: now,
        },
      }),
  ]);

  return { id, email };
}

export async function updateBuyer(id: string, input: UpdateBuyerInput): Promise<AdminBuyerRow> {
  const [current] = await db
    .select()
    .from(authUser)
    .where(and(eq(authUser.id, id), eq(authUser.userType, 'buyer')))
    .limit(1);
  if (!current) throw notFound('Buyer not found.');

  const now = new Date().toISOString();
  const firstName = input.firstName !== undefined ? input.firstName.trim() : current.firstName;
  const lastName = input.lastName !== undefined ? input.lastName.trim() : current.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || current.name;

  await db
    .update(authUser)
    .set({
      firstName,
      lastName,
      name: fullName,
      contactName: fullName,
      ...(input.company !== undefined ? { companyName: input.company?.trim() || null } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.country !== undefined ? { country: input.country.trim().toUpperCase() } : {}),
      ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
      ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      updatedAt: now,
    })
    .where(eq(authUser.id, id));

  if (input.tierMarkup !== undefined || input.notes !== undefined) {
    const [existingProfile] = await db
      .select()
      .from(buyerProfiles)
      .where(eq(buyerProfiles.authUserId, id))
      .limit(1);

    const nextMarkup =
      input.tierMarkup !== undefined
        ? String(input.tierMarkup)
        : (existingProfile?.tierMarkupPercent ?? '0');
    const nextNotes =
      input.notes !== undefined ? input.notes?.trim() || null : (existingProfile?.notes ?? null);

    await db
      .insert(buyerProfiles)
      .values({
        authUserId: id,
        tierMarkupPercent: nextMarkup,
        notes: nextNotes,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: buyerProfiles.authUserId,
        set: {
          tierMarkupPercent: nextMarkup,
          notes: nextNotes,
          updatedAt: now,
        },
      });
  }

  return getBuyer(id);
}

export async function setBuyerVerified(id: string, verified: boolean): Promise<AdminBuyerRow> {
  const [current] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(eq(authUser.id, id), eq(authUser.userType, 'buyer')))
    .limit(1);
  if (!current) throw notFound('Buyer not found.');

  await db
    .update(authUser)
    .set({ verified, updatedAt: new Date().toISOString() })
    .where(eq(authUser.id, id));

  return getBuyer(id);
}

export async function setBuyerSuspended(id: string, suspended: boolean): Promise<AdminBuyerRow> {
  const [current] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(eq(authUser.id, id), eq(authUser.userType, 'buyer')))
    .limit(1);
  if (!current) throw notFound('Buyer not found.');

  await db
    .update(authUser)
    .set({ banned: suspended, updatedAt: new Date().toISOString() })
    .where(eq(authUser.id, id));

  if (suspended) {
    await db.delete(authSession).where(eq(authSession.userId, id));
  }

  return getBuyer(id);
}

export async function deleteBuyer(id: string): Promise<{ id: string; email: string }> {
  const [current] = await db
    .select({ id: authUser.id, email: authUser.email })
    .from(authUser)
    .where(and(eq(authUser.id, id), eq(authUser.userType, 'buyer')))
    .limit(1);
  if (!current) throw notFound('Buyer not found.');

  const [{ value: orderCount }] = await db
    .select({ value: count() })
    .from(orderRequests)
    .where(and(eq(orderRequests.buyerId, id), isNull(orderRequests.deletedAt)));

  if (Number(orderCount ?? 0) > 0) {
    throw conflict('Cannot delete a buyer with existing orders. Suspend the account instead.');
  }

  await db.batch([
    db
      .update(accountRequests)
      .set({ createdBuyerAuthUserId: null })
      .where(eq(accountRequests.createdBuyerAuthUserId, id)),
    db.delete(authUser).where(eq(authUser.id, id)),
  ]);

  return { id: current.id, email: current.email };
}
