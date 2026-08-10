import { describe, expect, it } from 'vitest';
import { buildPhone, splitPhone, waHref } from './phone';

describe('buildPhone', () => {
  it('combines dial code and national number', () => {
    expect(buildPhone('+90', '5551234567')).toBe('+90 5551234567');
  });

  it('returns empty when national number is empty', () => {
    expect(buildPhone('+90', '')).toBe('');
    expect(buildPhone('+90', '   ')).toBe('');
  });

  it('does not double the code when the number already has a + prefix', () => {
    expect(buildPhone('+90', '+15551234567')).toBe('+15551234567');
  });

  it('normalizes a 00 international prefix to +', () => {
    expect(buildPhone('+90', '0015551234567')).toBe('+15551234567');
  });
});

describe('splitPhone', () => {
  it('splits a +90 number into TR + national digits', () => {
    expect(splitPhone('+90 5551234567')).toEqual({ countryCode: 'TR', number: '5551234567' });
  });

  it('uses the longest dial prefix (e.g. +35818 AX beats +358 FI)', () => {
    expect(splitPhone('+35818 12345')).toEqual({ countryCode: 'AX', number: '12345' });
  });

  it('defaults to TR with an empty number for empty / nullish input', () => {
    expect(splitPhone('')).toEqual({ countryCode: 'TR', number: '' });
    expect(splitPhone(null)).toEqual({ countryCode: 'TR', number: '' });
    expect(splitPhone(undefined)).toEqual({ countryCode: 'TR', number: '' });
  });

  it('defaults to TR when no dial code matches', () => {
    expect(splitPhone('+0000 123')).toEqual({ countryCode: 'TR', number: '' });
  });
});

describe('waHref', () => {
  it('strips non-digits from the phone', () => {
    expect(waHref('+90 555 123 45 67')).toBe('https://wa.me/905551234567');
  });
});
