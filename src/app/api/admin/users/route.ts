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
    return members.find((member) => member.email === body.email.toLowerCase()) ?? members[0];
  },
);
