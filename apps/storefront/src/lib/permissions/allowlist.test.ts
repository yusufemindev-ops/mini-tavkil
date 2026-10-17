import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAllowlist, isAllowlisted } from './allowlist';

afterEach(() => vi.unstubAllEnvs());

describe('ADMIN_ALLOWLIST', () => {
  it('denies everyone when unset', () => {
    // Fails closed. The alternative — an unset variable meaning "anyone with a
    // Google account" — turns one missing config line into a breach.
    vi.stubEnv('ADMIN_ALLOWLIST', '');
    expect(adminAllowlist()).toEqual([]);
    expect(isAllowlisted('anyone@example.com')).toBe(false);
  });

  it('denies everyone when the variable is entirely absent', () => {
    vi.stubEnv('ADMIN_ALLOWLIST', undefined as unknown as string);
    expect(isAllowlisted('anyone@example.com')).toBe(false);
  });

  it('allows a listed address', () => {
    vi.stubEnv('ADMIN_ALLOWLIST', 'owner@example.com');
    expect(isAllowlisted('owner@example.com')).toBe(true);
  });

  it('is case-insensitive and tolerates whitespace on both sides', () => {
    // Google returns the address as the user typed it at signup; the env var is
    // hand-edited. Neither casing nor stray spaces should decide access.
    vi.stubEnv('ADMIN_ALLOWLIST', '  Owner@Example.com , second@example.com ');
    expect(isAllowlisted('owner@example.com')).toBe(true);
    expect(isAllowlisted('OWNER@EXAMPLE.COM')).toBe(true);
    expect(isAllowlisted(' second@example.com ')).toBe(true);
  });

  it('rejects a near-miss rather than matching loosely', () => {
    vi.stubEnv('ADMIN_ALLOWLIST', 'owner@example.com');
    expect(isAllowlisted('owner@example.com.evil.test')).toBe(false);
    expect(isAllowlisted('notowner@example.com')).toBe(false);
    expect(isAllowlisted('owner@example.co')).toBe(false);
  });

  it('rejects null, undefined and empty', () => {
    vi.stubEnv('ADMIN_ALLOWLIST', 'owner@example.com');
    expect(isAllowlisted(null)).toBe(false);
    expect(isAllowlisted(undefined)).toBe(false);
    expect(isAllowlisted('')).toBe(false);
  });

  it('ignores empty entries from a trailing or doubled comma', () => {
    vi.stubEnv('ADMIN_ALLOWLIST', 'owner@example.com,,');
    expect(adminAllowlist()).toEqual(['owner@example.com']);
    expect(isAllowlisted('')).toBe(false);
  });
});
