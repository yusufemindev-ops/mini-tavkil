import { describe, expect, it } from 'vitest';
import {
  ASSIGNABLE_ROLES,
  isKnownPermission,
  OWNER_ROLE,
  PERMISSION_CATALOG,
  ROLE_GRANTS,
  ROLE_LABELS,
  roleGrants,
} from './catalog';

describe('permission catalog', () => {
  it('uses colon notation, never a dot', () => {
    // CLAUDE.md §6. A dot here silently breaks every guard that greps for the code.
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.code).toMatch(/^[a-z_]+:[a-z_]+$/);
      expect(permission.code).not.toContain('.');
    }
  });

  it('has no duplicate codes', () => {
    const codes = PERMISSION_CATALOG.map((permission) => permission.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("each code's prefix matches its domain", () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.code.split(':')[0]).toBe(permission.domain);
    }
  });

  it('drops the domains whose features were cut', () => {
    // orders, buyers, account_requests and audit_log do not exist in this project
    // (PLAN.md §3). A permission for a feature that isn't there is a guard nobody
    // will ever call, and a role editor's checkbox for nothing.
    const domains = new Set(PERMISSION_CATALOG.map((permission) => permission.domain));
    for (const gone of ['orders', 'buyers', 'account_requests', 'audit_log', 'roles']) {
      expect(domains.has(gone)).toBe(false);
    }
  });

  it('every permission has a name and a description', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.name.trim()).not.toBe('');
      expect(permission.description.trim()).not.toBe('');
    }
  });
});

describe('role grants', () => {
  it('grants only codes that exist in the catalog', () => {
    // A typo here fails open in the worst way: the grant silently does nothing and
    // the role quietly loses an ability nobody notices until someone is blocked.
    for (const [role, codes] of Object.entries(ROLE_GRANTS)) {
      for (const code of codes) {
        expect(isKnownPermission(code), `${role} grants unknown "${code}"`).toBe(true);
      }
    }
  });

  it('the Owner role holds the entire catalog without any grant rows', () => {
    expect(ROLE_GRANTS[OWNER_ROLE]).toBeUndefined();
    expect(roleGrants(OWNER_ROLE)).toHaveLength(PERMISSION_CATALOG.length);
  });

  it('Catalog manager can edit the catalogue but not settings or users', () => {
    const held = new Set(roleGrants('catalog_manager'));
    expect(held.has('products:edit')).toBe(true);
    expect(held.has('categories:publish')).toBe(true);
    expect(held.has('media:upload')).toBe(true);
    expect(held.has('settings:edit')).toBe(false);
    expect(held.has('users:assign_role')).toBe(false);
    expect(held.has('users:edit')).toBe(false);
  });

  it('Viewer holds nothing that writes', () => {
    for (const code of roleGrants('member')) {
      expect(code.endsWith(':view'), `Viewer holds "${code}"`).toBe(true);
    }
  });

  it('an unknown role holds nothing', () => {
    // Fails closed: a role code that isn't recognised must not inherit anything.
    expect(roleGrants('order_operator')).toEqual([]);
    expect(roleGrants('buyer')).toEqual([]);
    expect(roleGrants('')).toEqual([]);
  });

  it('exposes exactly the three fixed roles', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['super_admin', 'catalog_manager', 'member']);
    expect(Object.values(ROLE_LABELS)).toEqual(['Owner', 'Catalog manager', 'Viewer']);
  });
});
