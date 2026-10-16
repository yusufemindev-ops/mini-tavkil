import { Hono } from 'hono';
import {
  approveAccountRequest,
  deleteAccountRequest,
  listAccountRequests,
  rejectAccountRequest,
  reopenAccountRequest,
} from '@/lib/services/account-requests';
import {
  approveAccountRequestSchema,
  listAccountRequestsQuerySchema,
  rejectAccountRequestSchema,
} from '@/lib/services/account-requests-schema';
import {
  adminJson,
  auditAdmin,
  parseJson,
  parseQuery,
  requireAdminPerm,
  type AppEnv,
} from '@/server/factory';

export const adminAccountRequestsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('account_requests:view'), async (c) => {
    const query = parseQuery(c, listAccountRequestsQuerySchema);
    return adminJson(c, await listAccountRequests(query));
  })
  .post('/:id/approve', requireAdminPerm('account_requests:review'), async (c) => {
    const body = await parseJson(c, approveAccountRequestSchema);
    const id = c.req.param('id');
    const created = await approveAccountRequest(id, body, c.var.admin.id);
    await auditAdmin(c, {
      action: 'account_request.approved',
      resourceType: 'account_request',
      resourceId: id,
      target: created.email,
      summary: `Approved account request for ${created.email} (tier markup ${body.tierMarkup ?? 0}%)`,
    });
    return adminJson(c, created);
  })
  .post('/:id/reject', requireAdminPerm('account_requests:review'), async (c) => {
    let rawBody: unknown = {};
    try {
      rawBody = await c.req.json();
    } catch {
      rawBody = {};
    }
    const body = rejectAccountRequestSchema.parse(rawBody ?? {});
    const id = c.req.param('id');
    const res = await rejectAccountRequest(id, body, c.var.admin.id);
    await auditAdmin(c, {
      action: 'account_request.rejected',
      resourceType: 'account_request',
      resourceId: id,
      target: res.email,
      summary: `Rejected account request for ${res.email}`,
    });
    return adminJson(c, { status: res.status });
  })
  .post('/:id/reopen', requireAdminPerm('account_requests:review'), async (c) => {
    const id = c.req.param('id');
    const res = await reopenAccountRequest(id);
    await auditAdmin(c, {
      action: 'account_request.reopened',
      resourceType: 'account_request',
      resourceId: id,
      target: res.email,
      summary: `Moved account request for ${res.email} back to pending review`,
    });
    return adminJson(c, { status: res.status });
  })
  .delete('/:id', requireAdminPerm('account_requests:review'), async (c) => {
    const id = c.req.param('id');
    const res = await deleteAccountRequest(id);
    await auditAdmin(c, {
      action: 'account_request.deleted',
      resourceType: 'account_request',
      resourceId: id,
      target: res.email,
      summary: `Deleted account request for ${res.email}`,
    });
    return adminJson(c, { id: res.id });
  });
