import { describe, expect, it } from 'vitest';
import { assertUuid, isUniqueViolation } from './errors';

/**
 * Two guards that both turned ordinary mistakes into 500s.
 *
 * A 500 is not a cosmetic problem here: the admin sees "Something went wrong.",
 * which gives them nothing to act on, and it pages whoever is watching errors
 * for something that was never the server's fault.
 */
describe('isUniqueViolation', () => {
  it('sees through Drizzle’s wrapper, which is where the code actually lives', () => {
    // The real shape, captured from Neon: Drizzle re-throws with its own message
    // and hangs the driver error off `cause`. Checking only the top level meant
    // every duplicate slug 500'd.
    const wrapped = Object.assign(new Error('Failed query: insert into "supplier_translations"…'), {
      cause: Object.assign(
        new Error(
          'duplicate key value violates unique constraint "supplier_translations_locale_slug_key"',
        ),
        { code: '23505' },
      ),
    });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it('still recognises an unwrapped driver error', () => {
    expect(isUniqueViolation(Object.assign(new Error('nope'), { code: '23505' }))).toBe(true);
  });

  it('recognises it by message when no code survives', () => {
    expect(
      isUniqueViolation(new Error('duplicate key value violates unique constraint "x_key"')),
    ).toBe(true);
  });

  it('finds it however deeply it is nested', () => {
    const deep = new Error('outer', {
      cause: new Error('middle', { cause: Object.assign(new Error('inner'), { code: '23505' }) }),
    });
    expect(isUniqueViolation(deep)).toBe(true);
  });

  it('does not mistake other failures for a conflict', () => {
    expect(isUniqueViolation(new Error('connection reset'))).toBe(false);
    expect(isUniqueViolation(Object.assign(new Error('bad input'), { code: '22P02' }))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });

  it('survives a self-referencing cause instead of looping forever', () => {
    const cyclic: Error & { cause?: unknown } = new Error('loop');
    cyclic.cause = cyclic;
    expect(isUniqueViolation(cyclic)).toBe(false);
  });
});

describe('assertUuid', () => {
  it('accepts a real uuid', () => {
    expect(() => assertUuid('8d368600-b06a-4e30-aa52-bef2dfb21933', 'Supplier')).not.toThrow();
  });

  it('rejects anything else as not-found rather than letting Postgres raise', () => {
    // `GET /api/admin/products/not-a-uuid` used to reach the query, where
    // Postgres raised `invalid input syntax for type uuid` → 500.
    for (const bad of ['not-a-uuid', '', '123', '8d368600-b06a-4e30-aa52']) {
      expect(() => assertUuid(bad, 'Product'), bad).toThrow(/not found/i);
    }
  });

  it('names the thing that was not found, so the message is usable', () => {
    expect(() => assertUuid('nope', 'Category')).toThrow(/Category not found/);
  });
});
