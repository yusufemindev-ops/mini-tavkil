import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { conflict, invalid } from '@/lib/api/errors';
import { adminAllowlist } from '@/lib/permissions/allowlist';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type RoleCode } from '@/lib/permissions/catalog';

/** Key in system_settings storing dynamic admin invites beyond the bootstrap allowlist. */
export const TEAM_INVITES_KEY = 'admin_invites';

export interface TeamInvite {
  /** Canonical lowercased email used for authorization matching. */
  email: string;
  /** Original user-entered email casing for UI display. */
  displayEmail?: string;
  role: RoleCode;
  firstName: string;
  lastName: string;
  invitedAt: string;
}

export const createMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  firstName: z.string().trim().max(80).default(''),
  lastName: z.string().trim().max(80).default(''),
  // Accepts role database id or role code.
  roleId: z.string().trim().min(1, 'Pick a role.'),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export async function listInvites(): Promise<TeamInvite[]> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, TEAM_INVITES_KEY))
    .limit(1);
  const stored = (row?.value ?? []) as TeamInvite[];
  return Array.isArray(stored) ? stored : [];
}

/** Every address that may sign in: the env allowlist plus invited members. */
export async function allowedEmails(): Promise<Set<string>> {
  const invited = await listInvites();
  return new Set([...adminAllowlist(), ...invited.map((entry) => entry.email.toLowerCase())]);
}

/** The role an invited address should be given on first sign-in, if any. */
export async function invitedRoleFor(email: string): Promise<RoleCode | null> {
  const match = (await listInvites()).find(
    (entry) => entry.email.toLowerCase() === email.trim().toLowerCase(),
  );
  return match?.role ?? null;
}

async function writeInvites(invites: TeamInvite[], actorId: string): Promise<void> {
  await db
    .insert(systemSettings)
    .values({
      key: TEAM_INVITES_KEY,
      value: invites,
      description: 'Admin team members invited from the dashboard.',
      updatedByUserId: actorId,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: invites, updatedByUserId: actorId, updatedAt: new Date().toISOString() },
    });
}

/** Invites a new admin member with assigned role. */
export async function inviteMember(
  input: CreateMemberInput,
  actorId: string,
  resolveRole: (roleIdOrCode: string) => Promise<RoleCode | null>,
): Promise<TeamInvite> {
  const role = await resolveRole(input.roleId);
  if (!role) throw invalid('That role does not exist.');

  const email = input.email.toLowerCase();
  if (adminAllowlist().includes(email)) {
    throw conflict('That address is already on the deployment allowlist.');
  }

  const invites = await listInvites();
  if (invites.some((entry) => entry.email.toLowerCase() === email)) {
    throw conflict('That address has already been added.');
  }

  const invite: TeamInvite = {
    email,
    displayEmail: input.email.trim(),
    role,
    firstName: input.firstName,
    lastName: input.lastName,
    invitedAt: new Date().toISOString(),
  };
  await writeInvites([...invites, invite], actorId);
  return invite;
}

export const updateMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

/** Updates an unaccepted pending invite. Active accounts cannot be modified here. */
export async function updateInvite(
  currentEmail: string,
  input: UpdateMemberInput,
  actorId: string,
): Promise<TeamInvite> {
  const key = currentEmail.trim().toLowerCase();
  const invites = await listInvites();
  const index = invites.findIndex((entry) => entry.email.toLowerCase() === key);
  if (index === -1) throw invalid('That invite no longer exists.');

  const next = { ...invites[index] };

  if (input.email !== undefined) {
    const email = input.email.toLowerCase();
    if (email !== key) {
      if (adminAllowlist().includes(email)) {
        throw conflict('That address is already on the deployment allowlist.');
      }
      if (invites.some((entry, i) => i !== index && entry.email.toLowerCase() === email)) {
        throw conflict('That address has already been added.');
      }
    }
    next.email = email;
    next.displayEmail = input.email.trim();
  }
  if (input.firstName !== undefined) next.firstName = input.firstName;
  if (input.lastName !== undefined) next.lastName = input.lastName;

  const updated = [...invites];
  updated[index] = next;
  await writeInvites(updated, actorId);
  return next;
}

/** Remove an invite. Takes effect on their next request, not their next login. */
export async function revokeInvite(email: string, actorId: string): Promise<void> {
  const target = email.trim().toLowerCase();
  const invites = await listInvites();
  await writeInvites(
    invites.filter((entry) => entry.email.toLowerCase() !== target),
    actorId,
  );
}

/** Human label for a role code, for building an `AdminTeamMember` response. */
export function roleLabel(code: RoleCode): string {
  return ROLE_LABELS[code];
}

export function isRoleCode(value: string): value is RoleCode {
  return (ASSIGNABLE_ROLES as string[]).includes(value);
}
