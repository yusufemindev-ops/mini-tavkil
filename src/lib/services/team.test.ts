import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Team invites: who may sign in beyond the bootstrap allowlist.
 *
 * The bug worth pinning here is the role resolver. It used a module-level cache
 * warmed by `listRoles()`, which works locally — one long-lived process, the
 * roles page loads first — and fails in production, because Workers do not share
 * module state between invocations. The request that POSTed a new member landed
 * in a cold isolate with an empty map and every add was rejected with "That role
 * does not exist." A unit test IS a cold isolate, which is the point.
 */
const invitesStore: { value: unknown } = { value: [] };

vi.mock('@/lib/db', () => {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (invitesStore.value ? [{ value: invitesStore.value }] : []),
    insert: () => chain,
    values: (row: { value: unknown }) => {
      invitesStore.value = row.value;
      return chain;
    },
    onConflictDoUpdate: async (arg: { set: { value: unknown } }) => {
      invitesStore.value = arg.set.value;
    },
  };
  return { db: chain };
});

vi.mock('@/lib/permissions/allowlist', () => ({
  adminAllowlist: () => ['owner@example.com'],
}));

const { allowedEmails, inviteMember, invitedRoleFor, listInvites, revokeInvite } =
  await import('./team');

const resolveRole = async (value: string) =>
  value === 'role-uuid-catalog' || value === 'catalog_manager'
    ? ('catalog_manager' as const)
    : null;

beforeEach(() => {
  invitesStore.value = [];
});

describe('team invites', () => {
  it('accepts a role by database id, which is what the SPA sends', async () => {
    const invite = await inviteMember(
      {
        email: 'New.Person@Example.com',
        firstName: 'New',
        lastName: 'Person',
        roleId: 'role-uuid-catalog',
      },
      'actor',
      resolveRole,
    );
    expect(invite.role).toBe('catalog_manager');
    // Stored lowercased, because every lookup compares lowercased.
    expect(invite.email).toBe('new.person@example.com');
  });

  it('accepts a bare role code, so the API is usable by hand', async () => {
    const invite = await inviteMember(
      { email: 'a@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
      'actor',
      resolveRole,
    );
    expect(invite.role).toBe('catalog_manager');
  });

  it('rejects an unknown role rather than inviting with none', async () => {
    await expect(
      inviteMember(
        { email: 'b@example.com', firstName: '', lastName: '', roleId: 'nope' },
        'actor',
        resolveRole,
      ),
    ).rejects.toThrow(/role does not exist/i);
    expect(await listInvites()).toEqual([]);
  });

  it('refuses a duplicate, and refuses someone already on the env allowlist', async () => {
    await inviteMember(
      { email: 'c@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
      'actor',
      resolveRole,
    );
    await expect(
      inviteMember(
        { email: 'C@Example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
        'actor',
        resolveRole,
      ),
    ).rejects.toThrow(/already been added/i);

    await expect(
      inviteMember(
        { email: 'owner@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
        'actor',
        resolveRole,
      ),
    ).rejects.toThrow(/already on the deployment allowlist/i);
  });

  it('grants access to the env allowlist AND invited members', async () => {
    await inviteMember(
      { email: 'd@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
      'actor',
      resolveRole,
    );
    const allowed = await allowedEmails();
    expect(allowed.has('owner@example.com')).toBe(true);
    expect(allowed.has('d@example.com')).toBe(true);
    expect(allowed.has('stranger@example.com')).toBe(false);
  });

  it('reports the invited role so first sign-in can apply it', async () => {
    await inviteMember(
      { email: 'e@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
      'actor',
      resolveRole,
    );
    expect(await invitedRoleFor('E@Example.com ')).toBe('catalog_manager');
    expect(await invitedRoleFor('nobody@example.com')).toBeNull();
  });

  it('revoking removes access — checked per request, not per login', async () => {
    await inviteMember(
      { email: 'f@example.com', firstName: '', lastName: '', roleId: 'catalog_manager' },
      'actor',
      resolveRole,
    );
    await revokeInvite('F@Example.com', 'actor');
    expect((await allowedEmails()).has('f@example.com')).toBe(false);
  });
});
