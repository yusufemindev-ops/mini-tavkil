import { Hono } from 'hono';
import {
  approveProfileEditRequest,
  deleteProfileEditRequest,
  listAdminProfileEditRequests,
  rejectProfileEditRequest,
  reopenProfileEditRequest,
} from '@/lib/services/profile-edit-requests';
import {
  listProfileEditRequestsQuerySchema,
  rejectProfileEditRequestSchema,
} from '@/lib/services/profile-edit-requests-schema';
import { adminJson, auditAdmin, parseQuery, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminProfileEditRequestsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('account_requests:view'), async (c) => {
    const query = parseQuery(c, listProfileEditRequestsQuerySchema);
    return adminJson(c, await listAdminProfileEditRequests(query.status));
  })
  .post('/:id/approve', requireAdminPerm('account_requests:review'), async (c) => {
    const id = c.req.param('id');
    const res = await approveProfileEditRequest(id, c.var.admin.id);
    await auditAdmin(c, {
      action: 'profile_edit.approved',
      resourceType: 'account_request',
      resourceId: id,
      target: res.buyerEmail,
      summary: `Approved profile edit request for ${res.buyerEmail}`,
    });
    return adminJson(c, { id: res.id, status: res.status });
  })
  .post('/:id/reject', requireAdminPerm('account_requests:review'), async (c) => {
    let rawBody: unknown = {};
    try {
      rawBody = await c.req.json();
    } catch {
      rawBody = {};
    }
    const body = rejectProfileEditRequestSchema.parse(rawBody ?? {});
    const id = c.req.param('id');
    const res = await rejectProfileEditRequest(id, body.reason, c.var.admin.id);
    await auditAdmin(c, {
      action: 'profile_edit.rejected',
      resourceType: 'account_request',
      resourceId: id,
      target: res.buyerEmail,
      summary: `Rejected profile edit request for ${res.buyerEmail}`,
    });
    return adminJson(c, { id: res.id, status: res.status });
  })
  .post('/:id/reopen', requireAdminPerm('account_requests:review'), async (c) => {
    const id = c.req.param('id');
    const res = await reopenProfileEditRequest(id);
    await auditAdmin(c, {
      action: 'profile_edit.reopened',
      resourceType: 'account_request',
      resourceId: id,
      target: res.buyerEmail,
      summary: `Moved profile edit request for ${res.buyerEmail} back to pending review`,
    });
    return adminJson(c, { id: res.id, status: res.status });
  })
  .delete('/:id', requireAdminPerm('account_requests:review'), async (c) => {
    const id = c.req.param('id');
    const res = await deleteProfileEditRequest(id);
    await auditAdmin(c, {
      action: 'profile_edit.deleted',
      resourceType: 'account_request',
      resourceId: id,
      target: res.buyerEmail,
      summary: `Deleted profile edit request for ${res.buyerEmail}`,
    });
    return adminJson(c, { id: res.id });
  });
