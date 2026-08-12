import { adminRoute } from '@/lib/api/handler';
import { invalid } from '@/lib/api/errors';
import { listAdminUsers } from '@/lib/services/rbac';
import { updateInvite, updateMemberSchema, type UpdateMemberInput } from '@/lib/services/team';

export const dynamic = 'force-dynamic';

/**
 * Edit a member who has not signed in yet.
 *
 * The id is the synthesised `invite:<email>` the users list gives an invited
 * member — they have no `auth_user` row until their first Google sign-in, so
 * there is nothing else to address them by.
 *
 * A real user id is rejected rather than quietly ignored. Their name and email
 * are Google's copy, refreshed on every sign-in: writing to them here would
 * appear to work and then revert, and the address in particular is what the
 * account is matched on, so editing it is a way to point one person's access at
 * someone else's mailbox. Refusing with a reason is the honest answer.
 */
export const PATCH = adminRoute<{ id: string }, UpdateMemberInput>(
  'users:assign_role',
  updateMemberSchema,
  async ({ params, body, admin }) => {
    const id = decodeURIComponent(params.id);
    if (!id.startsWith('invite:')) {
      throw invalid(
        'Only invited members can be edited here. Once someone signs in, their name and email come from their Google account.',
      );
    }

    await updateInvite(id.slice('invite:'.length), body, admin.id);

    // The whole list, for the same reason POST returns it: an invited member's
    // row is synthesised, so re-reading keeps one definition of that shape.
    const members = await listAdminUsers(admin.id);
    const wanted = (body.email ?? id.slice('invite:'.length)).trim().toLowerCase();
    return members.find((member) => member.email.toLowerCase() === wanted) ?? members[0];
  },
);
