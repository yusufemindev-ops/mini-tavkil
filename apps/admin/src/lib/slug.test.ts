import { describe, expect, it } from 'vitest';
import { toSlug, toSlugLive } from './slug';

describe('toSlug', () => {
  it('lowercases and hyphenates Latin words', () => {
    expect(toSlug('Water Pump')).toBe('water-pump');
  });

  it('ASCII-transliterates Turkish letters', () => {
    expect(toSlug('Su Pompası')).toBe('su-pompasi');
  });

  it('preserves Arabic letters (no transliteration), space → hyphen', () => {
    expect(toSlug('مضخة مياه')).toBe('مضخة-مياه');
  });

  it('strips Latin punctuation and symbols', () => {
    expect(toSlug('Pump (5kVA)!')).toBe('pump-5kva');
  });

  it('strips Arabic punctuation while keeping Arabic letters', () => {
    expect(toSlug('مضخة؟')).toBe('مضخة');
  });

  it('returns empty string for empty or whitespace-only input', () => {
    expect(toSlug('')).toBe('');
    expect(toSlug('   ')).toBe('');
  });
});

describe('toSlugLive', () => {
  it('lowercases and hyphenates a full multi-word input', () => {
    expect(toSlugLive('first testname test here also')).toBe('first-testname-test-here-also');
  });

  it('keeps a trailing separator while typing (does not merge words)', () => {
    expect(toSlugLive('test ')).toBe('test-');
  });

  it('strips punctuation and symbols', () => {
    expect(toSlugLive('Pump (5kVA)!')).toBe('pump-5kva');
  });

  it('preserves Arabic letters, space → hyphen', () => {
    expect(toSlugLive('مضخة مياه')).toBe('مضخة-مياه');
  });

  it('collapses repeated separators and strips a leading hyphen', () => {
    expect(toSlugLive('  --a---b')).toBe('a-b');
  });
});
