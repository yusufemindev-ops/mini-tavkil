import { describe, expect, it } from 'vitest';
import { actionBadgeVariant } from './queries';

describe('actionBadgeVariant', () => {
  it('maps creation, publication, and restoration actions to success', () => {
    expect(actionBadgeVariant('product.created')).toBe('success');
    expect(actionBadgeVariant('category.published')).toBe('success');
    expect(actionBadgeVariant('user.invited')).toBe('success');
    expect(actionBadgeVariant('user.reactivated')).toBe('success');
    expect(actionBadgeVariant('product.restored')).toBe('success');
  });

  it('maps deletion, suspension, archive, and role revocation to destructive', () => {
    expect(actionBadgeVariant('product.deleted')).toBe('destructive');
    expect(actionBadgeVariant('user.suspended')).toBe('destructive');
    expect(actionBadgeVariant('product.archived')).toBe('destructive');
    expect(actionBadgeVariant('user.role_revoked')).toBe('destructive');
  });

  it('maps unpublish actions to warning', () => {
    expect(actionBadgeVariant('product.unpublished')).toBe('warning');
    expect(actionBadgeVariant('category.unpublished')).toBe('warning');
  });

  it('maps update, reorder, role assignment, and fx refresh to primary', () => {
    expect(actionBadgeVariant('product.updated')).toBe('primary');
    expect(actionBadgeVariant('category.reordered')).toBe('primary');
    expect(actionBadgeVariant('user.role_assigned')).toBe('primary');
    expect(actionBadgeVariant('currency.fx_refreshed')).toBe('primary');
  });

  it('falls back to secondary for other actions', () => {
    expect(actionBadgeVariant('media.uploaded')).toBe('secondary');
  });
});
