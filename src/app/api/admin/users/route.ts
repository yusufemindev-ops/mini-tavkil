import { adminRoute } from '@/lib/api/handler';
import { listAdminUsers, roleCodeFromIdOrCode } from '@/lib/services/rbac';
import { createMemberSchema, inviteMember, type CreateMemberInput } from '@/lib/services/team';

export const dynamic = 'force-dynamic';

// `admin.id` so the table can mark the current user's own row (`isYou`) and
// disable actions against themselves.
export const GET = adminRoute('users:view', async ({ admin }) => listAdminUsers(admin.id));

/**
 * Add a team member.
 *
 * The admin SPA has always had this form; there was no endpoint behind it, so
 * pressing "Add member" did nothing. `inviteMember` records the address and the
 * role, `getAdmin()` lets them past from that moment, and the role is applied
 * when they first sign in with Google.
 *
 * Returns the whole refreshed list rather than the single row: the invitee has
 * no `authUser` row yet, so the table entry is synthesised, and re-reading keeps
 * one definition of that shape instead of two.
 */
export const POST = adminRoute<Record<string, never>, CreateMemberInput>(
  'users:assign_role',
  createMemberSchema,
  async ({ body, admin }) => {
    await inviteMember(body, admin.id, roleCodeFromIdOrCode);
    const members = await listAdminUsers(admin.id);
    // Case-insensitively: the row carries the address as it was typed, while
    // `body.email` is whatever the admin entered. Comparing them directly
    // returned `members[0]` — a different person — the moment either had a
    // capital letter in it.
    const wanted = body.email.trim().toLowerCase();
    return members.find((member) => member.email.toLowerCase() === wanted) ?? members[0];
  },
);
