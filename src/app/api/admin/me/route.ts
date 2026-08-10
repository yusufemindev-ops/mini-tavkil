import { authErrorResponse, permissionsFor, requireAdmin } from '@/lib/auth-guard';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/lib/permissions/catalog';

/**
 * Who am I, and what may I do?
 *
 * The admin SPA (step 9) calls this once on load to decide which nav entries and
 * buttons to render. That is a UX decision only — every action is re-checked
 * server-side by `requirePermission` in its own handler, because a client that
 * hides a button has not prevented anything.
 *
 * Deliberately returns no price, no supplier, and nothing about any other user.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const held = await permissionsFor(admin.id);

    return Response.json(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        image: admin.image,
        permissions: [...held].sort(),
        roles: ASSIGNABLE_ROLES.map((code) => ({ code, label: ROLE_LABELS[code] })),
      },
      // A session-shaped response must never be cached by a proxy or the browser:
      // one admin's identity served to another is the whole bug class.
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
