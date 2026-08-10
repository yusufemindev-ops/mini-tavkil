import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { apiFieldErrors } from './field-errors';

const validationError = (issues: { path: (string | number)[]; message: string }[]) =>
  new ApiError('validation.failed', 'Validation failed.', 422, { issues });

describe('apiFieldErrors', () => {
  it('returns {} for non-ApiError and non-validation errors', () => {
    expect(apiFieldErrors(new Error('boom'))).toEqual({});
    expect(apiFieldErrors(new ApiError('resource.conflict', 'dup', 409))).toEqual({});
    expect(apiFieldErrors(null)).toEqual({});
  });

  it('maps each issue to the last string segment of its path by default', () => {
    const err = validationError([
      { path: ['sku'], message: 'SKU taken' },
      { path: ['translations', 0, 'name'], message: 'Name required' },
    ]);
    expect(apiFieldErrors(err)).toEqual({ sku: 'SKU taken', name: 'Name required' });
  });

  it('keeps the FIRST message when two issues map to the same key', () => {
    const err = validationError([
      { path: ['translations', 0, 'name'], message: 'first' },
      { path: ['translations', 1, 'name'], message: 'second' },
    ]);
    expect(apiFieldErrors(err)).toEqual({ name: 'first' });
  });

  it('applies a custom keyFor mapping', () => {
    const err = validationError([{ path: ['contactEmailInternal'], message: 'Invalid email' }]);
    expect(
      apiFieldErrors(err, {
        keyFor: (p) => (p[0] === 'contactEmailInternal' ? 'email' : undefined),
      }),
    ).toEqual({
      email: 'Invalid email',
    });
  });

  it('restricts results to the allowed keys', () => {
    const err = validationError([
      { path: ['sku'], message: 'a' },
      { path: ['unit'], message: 'b' },
    ]);
    expect(apiFieldErrors(err, { allowed: ['sku'] as const })).toEqual({ sku: 'a' });
  });
});
