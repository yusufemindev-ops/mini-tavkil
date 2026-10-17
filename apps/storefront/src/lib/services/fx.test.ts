import { describe, expect, it } from 'vitest';
import { isImplausibleJump, pickValid } from './fx';

// The two pure guards. Both exist to stop a free, key-less provider corrupting
// stored rates, so they're tested against the shapes bad data actually takes.

describe('pickValid', () => {
  it('keeps finite positive numbers for the requested codes', () => {
    expect(pickValid(['TRY', 'EUR'], { TRY: 34.2, EUR: 0.92 })).toEqual({ TRY: 34.2, EUR: 0.92 });
  });

  it('ignores codes that were not requested', () => {
    // A provider returning 160 currencies must not write 158 rows we never asked
    // for and have no currency record to join against.
    expect(pickValid(['TRY'], { TRY: 34.2, JPY: 150, GBP: 0.79 })).toEqual({ TRY: 34.2 });
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a string', '34.2'],
    ['null', null],
    ['undefined', undefined],
    ['an object', { value: 34.2 }],
  ])('drops %s', (_label, value) => {
    expect(pickValid(['TRY'], { TRY: value } as Record<string, unknown>)).toEqual({});
  });

  it('drops a missing code rather than writing undefined', () => {
    expect(pickValid(['TRY', 'EUR'], { TRY: 34.2 })).toEqual({ TRY: 34.2 });
  });
});

describe('isImplausibleJump', () => {
  it('accepts an ordinary daily move', () => {
    expect(isImplausibleJump(34.0, 34.5)).toBe(false);
    expect(isImplausibleJump(34.0, 33.5)).toBe(false);
  });

  it('accepts exactly 20%', () => {
    // The threshold is "more than 20%", so the boundary itself is allowed —
    // a real currency can move 20% in a day during a crisis.
    expect(isImplausibleJump(100, 120)).toBe(false);
    expect(isImplausibleJump(100, 80)).toBe(false);
  });

  it('refuses more than 20% in either direction', () => {
    expect(isImplausibleJump(100, 121)).toBe(true);
    expect(isImplausibleJump(100, 79)).toBe(true);
  });

  it('refuses the garbage shapes a broken feed produces', () => {
    // A provider returning a rate off by a factor of ten would otherwise silently
    // reprice everything the admin sees.
    expect(isImplausibleJump(34, 3.4)).toBe(true);
    expect(isImplausibleJump(34, 340)).toBe(true);
    expect(isImplausibleJump(34, 0.0001)).toBe(true);
  });

  it('allows any value when there is no current rate to compare against', () => {
    // First fetch for a currency: nothing to be implausible relative to.
    expect(isImplausibleJump(0, 34)).toBe(false);
    expect(isImplausibleJump(-1, 34)).toBe(false);
  });
});
