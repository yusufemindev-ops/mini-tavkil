import { describe, expect, it } from 'vitest';
import { appendImageRows } from './product-edit-page';

describe('appendImageRows', () => {
  it('marks the first uploaded image primary when the gallery is empty', () => {
    const rows = appendImageRows([], ['a.png', 'b.png']);
    expect(rows.map((r) => r.url)).toEqual(['a.png', 'b.png']);
    expect(rows.map((r) => r.isPrimary)).toEqual([true, false]);
  });

  it('does not steal primary from an existing image', () => {
    const existing = [{ key: 'k1', url: 'old.png', alt: '', isPrimary: true }];
    const rows = appendImageRows(existing, ['new.png']);
    expect(rows.map((r) => r.isPrimary)).toEqual([true, false]);
  });

  it('promotes the first new image when none of the existing rows are primary', () => {
    const existing = [{ key: 'k1', url: 'old.png', alt: '', isPrimary: false }];
    const rows = appendImageRows(existing, ['new.png']);
    expect(rows.find((r) => r.isPrimary)?.url).toBe('new.png');
  });

  it('seeds empty alt text on uploaded rows', () => {
    const rows = appendImageRows([], ['a.png']);
    expect(rows[0].alt).toBe('');
  });
});
