import { and, desc, eq } from 'drizzle-orm';
import { assertUuid, conflict, invalid, notFound } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { authUser, profileEditRequests } from '@/lib/db/schema';
import type { SubmitProfileEditRequestInput } from '@/lib/services/profile-edit-requests-schema';

export interface ProfileSnapshot {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  jobTitle: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
}

export interface BuyerPendingProfileEdit {
  id: string;
  updatedAt: string;
  proposed: ProfileSnapshot;
}

export interface AdminProfileEditRequest {
  id: string;
  buyerAuthUserId: string;
  buyerEmail: string;
  status: 'pending' | 'rejected';
  current: ProfileSnapshot;
  proposed: ProfileSnapshot;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

function asUtcIso(value: string): string {
  const hasZone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function norm(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function submitProfileEditRequest(
  authUserId: string,
  input: SubmitProfileEditRequestInput,
): Promise<BuyerPendingProfileEdit> {
  const [current] = await db
    .select({
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      companyName: authUser.companyName,
      phone: authUser.phone,
      jobTitle: authUser.jobTitle,
      country: authUser.country,
      city: authUser.city,
      address: authUser.address,
    })
    .from(authUser)
    .where(eq(authUser.id, authUserId))
    .limit(1);

  if (!current) throw notFound('Buyer profile not found.');

  const proposed: ProfileSnapshot = {
    firstName: norm(input.firstName),
    lastName: norm(input.lastName),
    company: norm(input.company),
    phone: norm(input.phone),
    jobTitle: norm(input.jobTitle),
    country: norm(input.country)?.toUpperCase() ?? null,
    city: norm(input.city),
    address: norm(input.address),
  };

  const unchanged =
    proposed.firstName === norm(current.firstName) &&
    proposed.lastName === norm(current.lastName) &&
    proposed.company === norm(current.companyName) &&
    proposed.phone === norm(current.phone) &&
    proposed.jobTitle === norm(current.jobTitle) &&
    proposed.country === (norm(current.country)?.toUpperCase() ?? null) &&
    proposed.city === norm(current.city) &&
    proposed.address === norm(current.address);

  if (unchanged) {
    throw invalid('No changes to submit.');
  }

  const nowIso = new Date().toISOString();
  const [existing] = await db
    .select({ id: profileEditRequests.id })
    .from(profileEditRequests)
    .where(
      and(
        eq(profileEditRequests.authUserId, authUserId),
        eq(profileEditRequests.status, 'pending'),
      ),
    )
    .limit(1);

  const values = {
    proposedFirstName: proposed.firstName,
    proposedLastName: proposed.lastName,
    proposedCompany: proposed.company,
    proposedPhone: proposed.phone,
    proposedJobTitle: proposed.jobTitle,
    proposedCountry: proposed.country,
    proposedCity: proposed.city,
    proposedAddress: proposed.address,
    updatedAt: nowIso,
  };

  if (existing) {
    await db.update(profileEditRequests).set(values).where(eq(profileEditRequests.id, existing.id));
    return { id: existing.id, updatedAt: nowIso, proposed };
  }

  const [created] = await db
    .insert(profileEditRequests)
    .values({
      authUserId,
      status: 'pending',
      createdAt: nowIso,
      ...values,
    })
    .returning({ id: profileEditRequests.id });

  return { id: created!.id, updatedAt: nowIso, proposed };
}

export async function getPendingProfileEditRequest(
  authUserId: string,
): Promise<BuyerPendingProfileEdit | null> {
  const [row] = await db
    .select()
    .from(profileEditRequests)
    .where(
      and(
        eq(profileEditRequests.authUserId, authUserId),
        eq(profileEditRequests.status, 'pending'),
      ),
    )
    .orderBy(desc(profileEditRequests.updatedAt))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    updatedAt: asUtcIso(row.updatedAt),
    proposed: {
      firstName: row.proposedFirstName,
      lastName: row.proposedLastName,
      company: row.proposedCompany,
      phone: row.proposedPhone,
      jobTitle: row.proposedJobTitle,
      country: row.proposedCountry?.trim() ?? null,
      city: row.proposedCity,
      address: row.proposedAddress,
    },
  };
}

export async function cancelProfileEditRequest(
  authUserId: string,
): Promise<{ cancelled: boolean }> {
  const deleted = await db
    .delete(profileEditRequests)
    .where(
      and(
        eq(profileEditRequests.authUserId, authUserId),
        eq(profileEditRequests.status, 'pending'),
      ),
    )
    .returning({ id: profileEditRequests.id });

  return { cancelled: deleted.length > 0 };
}

export async function listAdminProfileEditRequests(
  status: 'pending' | 'rejected' = 'pending',
): Promise<AdminProfileEditRequest[]> {
  const rows = await db
    .select({
      id: profileEditRequests.id,
      authUserId: profileEditRequests.authUserId,
      status: profileEditRequests.status,
      proposedFirstName: profileEditRequests.proposedFirstName,
      proposedLastName: profileEditRequests.proposedLastName,
      proposedCompany: profileEditRequests.proposedCompany,
      proposedPhone: profileEditRequests.proposedPhone,
      proposedJobTitle: profileEditRequests.proposedJobTitle,
      proposedCountry: profileEditRequests.proposedCountry,
      proposedCity: profileEditRequests.proposedCity,
      proposedAddress: profileEditRequests.proposedAddress,
      rejectionReason: profileEditRequests.rejectionReason,
      createdAt: profileEditRequests.createdAt,
      updatedAt: profileEditRequests.updatedAt,
      buyerEmail: authUser.email,
      currentFirstName: authUser.firstName,
      currentLastName: authUser.lastName,
      currentCompany: authUser.companyName,
      currentPhone: authUser.phone,
      currentJobTitle: authUser.jobTitle,
      currentCountry: authUser.country,
      currentCity: authUser.city,
      currentAddress: authUser.address,
    })
    .from(profileEditRequests)
    .innerJoin(authUser, eq(authUser.id, profileEditRequests.authUserId))
    .where(eq(profileEditRequests.status, status))
    .orderBy(desc(profileEditRequests.updatedAt))
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    buyerAuthUserId: r.authUserId,
    buyerEmail: r.buyerEmail,
    status: r.status as 'pending' | 'rejected',
    current: {
      firstName: r.currentFirstName,
      lastName: r.currentLastName,
      company: r.currentCompany,
      phone: r.currentPhone,
      jobTitle: r.currentJobTitle,
      country: r.currentCountry?.trim() ?? null,
      city: r.currentCity,
      address: r.currentAddress,
    },
    proposed: {
      firstName: r.proposedFirstName,
      lastName: r.proposedLastName,
      company: r.proposedCompany,
      phone: r.proposedPhone,
      jobTitle: r.proposedJobTitle,
      country: r.proposedCountry?.trim() ?? null,
      city: r.proposedCity,
      address: r.proposedAddress,
    },
    rejectionReason: r.rejectionReason,
    createdAt: asUtcIso(r.createdAt),
    updatedAt: asUtcIso(r.updatedAt),
  }));
}

export async function approveProfileEditRequest(
  id: string,
  actorId: string,
): Promise<{ id: string; status: 'approved'; buyerEmail: string }> {
  assertUuid(id, 'Profile edit request');
  const [req] = await db
    .select()
    .from(profileEditRequests)
    .where(eq(profileEditRequests.id, id))
    .limit(1);

  if (!req) throw notFound('Profile edit request not found.');
  if (req.status !== 'pending') {
    throw conflict(`Profile edit request is already ${req.status}.`);
  }

  const [buyer] = await db
    .select({ id: authUser.id, email: authUser.email, name: authUser.name })
    .from(authUser)
    .where(eq(authUser.id, req.authUserId))
    .limit(1);

  if (!buyer) throw notFound('Buyer account not found.');

  const nowIso = new Date().toISOString();
  const fullName =
    [req.proposedFirstName, req.proposedLastName].filter(Boolean).join(' ').trim() || buyer.name;

  await db.batch([
    db
      .update(authUser)
      .set({
        name: fullName,
        contactName: fullName,
        firstName: req.proposedFirstName,
        lastName: req.proposedLastName,
        companyName: req.proposedCompany,
        phone: req.proposedPhone,
        jobTitle: req.proposedJobTitle,
        country: req.proposedCountry?.trim() ?? null,
        city: req.proposedCity,
        address: req.proposedAddress,
        updatedAt: nowIso,
      })
      .where(eq(authUser.id, req.authUserId)),
    db
      .update(profileEditRequests)
      .set({
        status: 'approved',
        reviewedByAuthUserId: actorId,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(profileEditRequests.id, id)),
  ]);

  return { id: req.id, status: 'approved', buyerEmail: buyer.email };
}

export async function rejectProfileEditRequest(
  id: string,
  reason: string | undefined,
  actorId: string,
): Promise<{ id: string; status: 'rejected'; buyerEmail: string }> {
  assertUuid(id, 'Profile edit request');
  const [req] = await db
    .select()
    .from(profileEditRequests)
    .where(eq(profileEditRequests.id, id))
    .limit(1);

  if (!req) throw notFound('Profile edit request not found.');
  if (req.status !== 'pending') {
    throw conflict(`Profile edit request is already ${req.status}.`);
  }

  const [buyer] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, req.authUserId))
    .limit(1);

  const nowIso = new Date().toISOString();
  await db
    .update(profileEditRequests)
    .set({
      status: 'rejected',
      rejectionReason: reason?.trim() || null,
      reviewedByAuthUserId: actorId,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(profileEditRequests.id, id));

  const buyerEmail = buyer?.email ?? req.authUserId;
  return { id: req.id, status: 'rejected', buyerEmail };
}

export async function reopenProfileEditRequest(
  id: string,
): Promise<{ id: string; status: 'pending'; buyerEmail: string }> {
  assertUuid(id, 'Profile edit request');
  const [req] = await db
    .select()
    .from(profileEditRequests)
    .where(eq(profileEditRequests.id, id))
    .limit(1);

  if (!req) throw notFound('Profile edit request not found.');
  if (req.status !== 'rejected') {
    throw conflict('Only rejected profile edit requests can be moved back to review.');
  }

  const [buyer] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, req.authUserId))
    .limit(1);

  const nowIso = new Date().toISOString();
  await db
    .update(profileEditRequests)
    .set({
      status: 'pending',
      rejectionReason: null,
      reviewedByAuthUserId: null,
      reviewedAt: null,
      updatedAt: nowIso,
    })
    .where(eq(profileEditRequests.id, id));

  const buyerEmail = buyer?.email ?? req.authUserId;
  return { id: req.id, status: 'pending', buyerEmail };
}

export async function deleteProfileEditRequest(
  id: string,
): Promise<{ id: string; buyerEmail: string }> {
  assertUuid(id, 'Profile edit request');
  const [req] = await db
    .select()
    .from(profileEditRequests)
    .where(eq(profileEditRequests.id, id))
    .limit(1);

  if (!req) throw notFound('Profile edit request not found.');

  const [buyer] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, req.authUserId))
    .limit(1);

  await db.delete(profileEditRequests).where(eq(profileEditRequests.id, id));

  const buyerEmail = buyer?.email ?? req.authUserId;
  return { id: req.id, buyerEmail };
}
