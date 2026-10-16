import { describe, expect, it } from 'vitest';
import {
  assignRoleSchema,
  createRoleSchema,
  slugifyRoleCode,
  updateRoleSchema,
} from './rbac-schema';

describe('rbac-schema', () => {
  it('slugifies display role names into snake_case role codes', () => {
    expect(slugifyRoleCode('Regional Order Coordinator')).toBe('regional_order_coordinator');
    expect(slugifyRoleCode('  Buyer Support & Ops!  ')).toBe('buyer_support_ops');
  });

  it('validates createRoleSchema with catalog permissions', () => {
    const parsed = createRoleSchema.parse({
      name: 'Order Coordinator',
      description: 'Reviews and confirms wholesale order requests.',
      permissions: ['orders:view', 'orders:confirm', 'buyers:view'],
    });
    expect(parsed.name).toBe('Order Coordinator');
    expect(parsed.permissions).toHaveLength(3);
  });

  it('rejects createRoleSchema with unknown or dot-notation permissions', () => {
    expect(() =>
      createRoleSchema.parse({
        name: 'Bad Role',
        permissions: ['orders.confirm'],
      }),
    ).toThrow(/not in the permission catalog/i);

    expect(() =>
      createRoleSchema.parse({
        name: 'Empty Role',
        permissions: [],
      }),
    ).toThrow(/at least one permission/i);

    expect(() =>
      createRoleSchema.parse({
        name: '<script>Role</script>',
        permissions: ['orders:view'],
      }),
    ).toThrow(/markup characters/i);
  });

  it('validates updateRoleSchema and rejects empty update payloads', () => {
    expect(
      updateRoleSchema.parse({
        name: 'Updated Coordinator',
        permissions: ['orders:view'],
      }).name,
    ).toBe('Updated Coordinator');

    expect(() => updateRoleSchema.parse({})).toThrow(/at least one field/i);
  });

  it('accepts either role code or roleId in assignRoleSchema including custom role codes', () => {
    expect(assignRoleSchema.parse({ role: 'custom_ops_role' }).role).toBe('custom_ops_role');
    expect(assignRoleSchema.parse({ roleId: '00000000-0000-0000-0000-000000000001' }).roleId).toBe(
      '00000000-0000-0000-0000-000000000001',
    );
    expect(() => assignRoleSchema.parse({})).toThrow(/pick a role/i);
  });
});
