import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { conflict, invalid } from '@/lib/api/errors';
import { adminAllowlist } from '@/lib/permissions/allowlist';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type RoleCode } from '@/lib/permissions/catalog';

/**
 * Who may sign in, beyond the bootstrap allowlist.
 *
 * `ADMIN_ALLOWLIST` is a Worker secret. That makes it a fine *bootstrap* — the
 * first owner has to exist before anyone can grant anything — but a terrible
 * team-management tool: adding a colleague meant editing a secret and
 * redeploying, and the admin's own "Add member" form had no endpoint behind it
 * at all. Pressing it did nothing.
 *
 * So access is now: **on the env allowlist, OR invited here by an admin who
 * holds `users:assign_role`**. That grants no authority the allowlist did not
 * already imply, because only an existing admin can add an entry, and every
 * request still resolves permissions from `auth_user_roles`.
 *
 * Stored in `system_settings` rather than its own table on purpose: it is a
 * short list that changes rarely, and a migration is a deliberate act with no
 * staging to catch a mistake (CLAUDE.md §7, §8).
 */
export const TEAM_INVITES_KEY = 'admin_invites';

export interface TeamInvite {
  /**
   * Lowercased. This is the matching key — `allowedEmails()`, `invitedRoleFor()`
   * and the duplicate check all compare against it, so it must stay canonical.
   */
  email: string;
  /**
   * What the admin actually typed, for display only.
   *
   * Addresses were stored lowercased and then shown that way, so inviting
   * `Omar.Assad99@gmail.com` listed a person as `omar.assad99@gmail.com` — the
   * team page was quietly correcting someone's own name back at them. Mail
   * providers treat the local part case-insensitively in practice, so matching
   * must stay lowercase; only the rendering was wrong.
   *
   * Optional because invites written before this existed have no value for it,
   * and those fall back to `email`.
   */
  displayEmail?: string;
  role: RoleCode;
  firstName: string;
  lastName: string;
  invitedAt: string;
}

export const createMemberSchema = z.object({
  // Not `.toLowerCase()` here: the casing the admin typed is kept for display
  // and lowercased where it is compared. See `TeamInvite.displayEmail`.
  email: z.string().trim().email('Enter a valid email address.'),
  firstName: z.string().trim().max(80).default(''),
  lastName: z.string().trim().max(80).default(''),
  // The SPA sends the role's database id; it also accepts a bare code so the API
  // is usable by hand.
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

/**
 * Invite someone. They sign in with Google as normal; the role is applied when
 * their account is created, and `getAdmin()` lets them past from this moment.
 */
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

/**
 * Correct an invite that has not been accepted yet.
 *
 * Only invites. Once someone signs in, their name and address come from Google
 * on every sign-in, so a value edited here would be silently overwritten the
 * next time they logged in — and the address is the identity the account is
 * matched on, which makes editing it a way to hand one person's access to
 * another. The dashboard therefore offers this only while `status === 'invited'`,
 * and the endpoint enforces the same rule rather than trusting it.
 *
 * Before this existed, a typo in an invited address could only be fixed by
 * revoking and re-inviting.
 */
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
