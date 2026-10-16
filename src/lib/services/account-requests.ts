import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { accountRequests, authUser, buyerProfiles } from '@/lib/db/schema';
import { assertUuid, conflict, notFound } from '@/lib/api/errors';
import { createBuyer, type CreatedBuyer } from '@/lib/services/buyers';
import { notifyAccountApproved } from '@/lib/services/notifications';
import type {
  ApproveAccountRequestInput,
  ListAccountRequestsQuery,
  RejectAccountRequestInput,
  SubmitAccountRequestInput,
} from '@/lib/services/account-requests-schema';

export type AccountRequestStatus = 'pending' | 'rejected';

export interface AdminAccountRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  countryCode: string;
  city: string | null;
  address: string | null;
  message: string | null;
  status: AccountRequestStatus;
  createdAt: string;
}

function asUtcIso(value: string): string {
  const hasZone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export async function listAccountRequests(
  query?: Partial<ListAccountRequestsQuery>,
): Promise<AdminAccountRequest[]> {
  const filters = [
    query?.status
      ? eq(accountRequests.status, query.status)
      : inArray(accountRequests.status, ['pending', 'rejected']),
  ];
  if (query?.search) {
    const pattern = `%${query.search}%`;
    filters.push(
      or(
        ilike(accountRequests.businessEmail, pattern),
        ilike(accountRequests.company, pattern),
        ilike(accountRequests.firstName, pattern),
        ilike(accountRequests.lastName, pattern),
      )!,
    );
  }

  const limit = Math.min(Math.max(query?.limit ?? 500, 1), 500);
  const offset = Math.max(query?.offset ?? 0, 0);

  const rows = await db
    .select()
    .from(accountRequests)
    .where(and(...filters))
    .orderBy(desc(accountRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.businessEmail,
    phone: r.phone,
    jobTitle: r.jobTitle,
    company: r.company,
    countryCode: r.countryCode.trim(),
    city: r.city,
    address: r.address,
    message: r.message,
    status: r.status as AccountRequestStatus,
    createdAt: asUtcIso(r.createdAt),
  }));
}

export async function submitPublicAccountRequest(
  input: SubmitAccountRequestInput,
): Promise<{ id: string; status: 'pending' }> {
  const email = input.email.trim().toLowerCase();

  const [existingBuyer, existingPending] = await Promise.all([
    db
      .select({ id: authUser.id })
      .from(authUser)
      .where(sql`lower(${authUser.email}) = ${email}`)
      .limit(1),
    db
      .select({ id: accountRequests.id })
      .from(accountRequests)
      .where(
        and(
          sql`lower(${accountRequests.businessEmail}) = ${email}`,
          eq(accountRequests.status, 'pending'),
        ),
      )
      .limit(1),
  ]);

  if (existingBuyer.length > 0 || existingPending.length > 0) {
    throw conflict('This email already has an account or a pending request.');
  }

  const [created] = await db
    .insert(accountRequests)
    .values({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      businessEmail: email,
      phone: input.phone.trim(),
      jobTitle: input.jobTitle?.trim() || null,
      company: input.company.trim(),
      countryCode: input.country.trim().toUpperCase(),
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      message: input.message?.trim() || null,
      locale: input.locale,
      status: 'pending',
    })
    .returning({ id: accountRequests.id });

  return { id: created!.id, status: 'pending' };
}

export async function approveAccountRequest(
  id: string,
  input: ApproveAccountRequestInput,
  actorId: string,
): Promise<CreatedBuyer> {
  assertUuid(id, 'Account request');
  const [req] = await db.select().from(accountRequests).where(eq(accountRequests.id, id)).limit(1);

  if (!req) throw notFound('Account request not found.');
  if (req.status !== 'pending') {
    throw conflict(`Account request is already ${req.status}.`);
  }

  const email = req.businessEmail.trim().toLowerCase();
  const tierMarkup = input.tierMarkup ?? 0;
  const now = new Date().toISOString();

  const [existing] = await db
    .select({ id: authUser.id, email: authUser.email })
    .from(authUser)
    .where(sql`lower(${authUser.email}) = ${email}`)
    .limit(1);

  let buyer: CreatedBuyer;
  if (existing) {
    buyer = { id: existing.id, email: existing.email };
    await db
      .insert(buyerProfiles)
      .values({
        authUserId: existing.id,
        tierMarkupPercent: String(tierMarkup),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: buyerProfiles.authUserId,
        set: {
          tierMarkupPercent: String(tierMarkup),
          updatedAt: now,
        },
      });
    void notifyAccountApproved({
      to: existing.email,
      contactName: `${req.firstName} ${req.lastName}`.trim(),
      companyName: req.company ?? existing.email,
    });
  } else {
    buyer = await createBuyer({
      email,
      firstName: req.firstName,
      lastName: req.lastName,
      phone: req.phone ?? '',
      country: req.countryCode.trim(),
      companyName: req.company ?? undefined,
      jobTitle: req.jobTitle ?? undefined,
      city: req.city ?? undefined,
      address: req.address ?? undefined,
      tierMarkup,
    });
  }

  await db
    .update(accountRequests)
    .set({
      status: 'approved',
      reviewedAt: now,
      reviewedByAuthUserId: actorId,
      createdBuyerAuthUserId: buyer.id,
    })
    .where(eq(accountRequests.id, id));

  return buyer;
}

export async function rejectAccountRequest(
  id: string,
  input: RejectAccountRequestInput,
  actorId: string,
): Promise<{ status: 'rejected'; email: string }> {
  assertUuid(id, 'Account request');
  const [req] = await db.select().from(accountRequests).where(eq(accountRequests.id, id)).limit(1);

  if (!req) throw notFound('Account request not found.');
  if (req.status !== 'pending') {
    throw conflict(`Account request is already ${req.status}.`);
  }

  await db
    .update(accountRequests)
    .set({
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedByAuthUserId: actorId,
      rejectionReason: input.reason?.trim() || null,
    })
    .where(eq(accountRequests.id, id));

  return { status: 'rejected', email: req.businessEmail };
}

export async function reopenAccountRequest(
  id: string,
): Promise<{ status: 'pending'; email: string }> {
  assertUuid(id, 'Account request');
  const [req] = await db.select().from(accountRequests).where(eq(accountRequests.id, id)).limit(1);

  if (!req) throw notFound('Account request not found.');
  if (req.status !== 'rejected') {
    throw conflict('Only rejected requests can be moved back to review.');
  }

  await db
    .update(accountRequests)
    .set({
      status: 'pending',
      reviewedAt: null,
      reviewedByAuthUserId: null,
      rejectionReason: null,
    })
    .where(eq(accountRequests.id, id));

  return { status: 'pending', email: req.businessEmail };
}

export async function deleteAccountRequest(id: string): Promise<{ id: string; email: string }> {
  assertUuid(id, 'Account request');
  const [req] = await db
    .select({ id: accountRequests.id, businessEmail: accountRequests.businessEmail })
    .from(accountRequests)
    .where(eq(accountRequests.id, id))
    .limit(1);

  if (!req) throw notFound('Account request not found.');

  await db.delete(accountRequests).where(eq(accountRequests.id, id));
  return { id: req.id, email: req.businessEmail };
}
