import { describe, expect, it } from 'vitest';
import {
  dependenciesOf,
  domainCodes,
  grantWithDeps,
  groupState,
  lockedCodes,
  toggleAction,
  toggleDomain,
} from './permissions';
import type { PermissionCatalogDomain } from './queries';

const ALL = new Set(['products:view', 'products:create', 'products:edit', 'users:invite']);

// A representative catalog domain (shape returned by GET /admin/permissions/catalog).
const products: PermissionCatalogDomain = {
  domain: 'products',
  actions: [
    { action: 'view', code: 'products:view', name: 'View', description: '' },
    { action: 'create', code: 'products:create', name: 'Create', description: '' },
    { action: 'edit', code: 'products:edit', name: 'Edit', description: '' },
  ],
};

describe('groupState', () => {
  it('is "none" when nothing is granted', () => {
    expect(groupState(products, new Set())).toBe('none');
  });
  it('is "all" when every action is granted', () => {
    expect(groupState(products, new Set(domainCodes(products)))).toBe('all');
  });
  it('is "some" when partially granted', () => {
    expect(groupState(products, new Set(['products:view']))).toBe('some');
  });
});

describe('toggle helpers are pure (return a new Set) and correct', () => {
  it('toggleAction adds and removes without mutating the input', () => {
    const start = new Set<string>();
    const added = toggleAction(start, 'products:view', true);
    expect(start.size).toBe(0);
    expect(added.has('products:view')).toBe(true);
    expect(toggleAction(added, 'products:view', false).has('products:view')).toBe(false);
  });

  it('toggleDomain grants then revokes an entire domain', () => {
    const all = toggleDomain(new Set(), products, true);
    expect(domainCodes(products).every((c) => all.has(c))).toBe(true);
    expect(groupState(products, all)).toBe('all');

    const none = toggleDomain(all, products, false);
    expect(domainCodes(products).some((c) => none.has(c))).toBe(false);
    expect(groupState(products, none)).toBe('none');
  });
});

describe('permission dependencies (auto-include)', () => {
  it('a non-view action depends on its domain view', () => {
    expect(dependenciesOf('products:edit', ALL)).toEqual(['products:view']);
    expect(dependenciesOf('products:view', ALL)).toEqual([]);
  });

  it('a domain with no view action has no dependency', () => {
    expect(dependenciesOf('users:invite', ALL)).toEqual([]); // users has no users:view
  });

  it('grantWithDeps pulls in the required view', () => {
    const next = grantWithDeps(new Set(), 'products:edit', ALL);
    expect(next.has('products:edit')).toBe(true);
    expect(next.has('products:view')).toBe(true);
  });

  it('lockedCodes marks a view that a granted action depends on', () => {
    const granted = grantWithDeps(new Set(), 'products:edit', ALL);
    expect(lockedCodes(granted, ALL).has('products:view')).toBe(true);
    // …and once the dependent is gone, the view is free again.
    const onlyView = toggleAction(granted, 'products:edit', false);
    expect(lockedCodes(onlyView, ALL).has('products:view')).toBe(false);
  });
});
