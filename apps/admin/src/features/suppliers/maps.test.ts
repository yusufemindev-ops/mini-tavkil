import { describe, expect, it } from 'vitest';
import { resolveMapsHref } from './maps';

describe('resolveMapsHref', () => {
  it('prefers the explicit map URL over the address', () => {
    expect(resolveMapsHref('https://maps.app.goo.gl/abc', 'Some Street, City')).toBe(
      'https://maps.app.goo.gl/abc',
    );
  });

  it('falls back to a Maps search over the address when no map URL is set', () => {
    expect(resolveMapsHref('', 'Atatürk Cd. No: 12, İstanbul')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Atat%C3%BCrk%20Cd.%20No%3A%2012%2C%20%C4%B0stanbul',
    );
  });

  it('trims whitespace before deciding', () => {
    expect(resolveMapsHref('   ', '  Denizli, Türkiye  ')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Denizli%2C%20T%C3%BCrkiye',
    );
  });

  it('returns an empty string when both are empty (button stays disabled)', () => {
    expect(resolveMapsHref('', '')).toBe('');
    expect(resolveMapsHref('   ', '   ')).toBe('');
  });
});
