import { describe, expect, it } from 'vitest';
import { appendImageRows, cleanAlt } from './product-edit-page';

describe('appendImageRows', () => {
  it('marks the first uploaded image primary when the gallery is empty', () => {
    const rows = appendImageRows([], ['a.png', 'b.png']);
    expect(rows.map((r) => r.url)).toEqual(['a.png', 'b.png']);
    expect(rows.map((r) => r.isPrimary)).toEqual([true, false]);
  });

  it('does not steal primary from an existing image', () => {
    const existing = [{ key: 'k1', url: 'old.png', alt: {}, isPrimary: true }];
    const rows = appendImageRows(existing, ['new.png']);
    expect(rows.map((r) => r.isPrimary)).toEqual([true, false]);
  });

  it('promotes the first new image when none of the existing rows are primary', () => {
    const existing = [{ key: 'k1', url: 'old.png', alt: {}, isPrimary: false }];
    const rows = appendImageRows(existing, ['new.png']);
    expect(rows.find((r) => r.isPrimary)?.url).toBe('new.png');
  });

  it('seeds an empty per-locale alt record on uploaded rows', () => {
    const rows = appendImageRows([], ['a.png']);
    expect(rows[0].alt).toEqual({});
  });
});

/**
 * Alt text is a translation record here, not a string. When the draft treated it
 * as a string the field showed "[object Object]" and every save of a product
 * that had an image failed with "Could not save the product." — silently, since
 * the throw happened before any request was made.
 */
describe('cleanAlt', () => {
  it('keeps only locales that actually have copy', () => {
    expect(cleanAlt({ en: 'Blue mop head', tr: '', ar: '  ' })).toEqual({ en: 'Blue mop head' });
  });

  it('trims, so a stray space is not stored as alt text', () => {
    expect(cleanAlt({ en: '  Coil rope  ' })).toEqual({ en: 'Coil rope' });
  });

  it('sends nothing rather than an empty record', () => {
    expect(cleanAlt({})).toBeUndefined();
    expect(cleanAlt({ en: '', tr: '' })).toBeUndefined();
  });

  it('preserves every locale the user wrote', () => {
    const all = { en: 'Cotton mop', tr: 'Pamuk paspas', ar: 'ممسحة قطنية' };
    expect(cleanAlt(all)).toEqual(all);
  });
});
