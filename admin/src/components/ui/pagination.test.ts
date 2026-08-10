import { describe, expect, it } from 'vitest';
import { getPageWindow } from './pagination';

describe('getPageWindow', () => {
  it('lists every page when they all fit in the window', () => {
    expect(getPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(getPageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it('windows around the current page, eliding the rest', () => {
    // page 1 of 5, window 1 → pages 3–4 are hidden behind a single ellipsis.
    expect(getPageWindow(1, 5)).toEqual([1, 2, '…', 5]);
    expect(getPageWindow(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('has no leading ellipsis near the start', () => {
    expect(getPageWindow(2, 10)).toEqual([1, 2, 3, '…', 10]);
  });

  it('has no trailing ellipsis near the end', () => {
    expect(getPageWindow(9, 10)).toEqual([1, '…', 8, 9, 10]);
  });

  it('collapses to a single page', () => {
    expect(getPageWindow(1, 1)).toEqual([1]);
  });

  it('never repeats a page number', () => {
    for (let pageCount = 1; pageCount <= 20; pageCount++) {
      for (let page = 1; page <= pageCount; page++) {
        const nums = getPageWindow(page, pageCount).filter((p): p is number => p !== '…');
        expect(new Set(nums).size).toBe(nums.length);
        expect(nums[0]).toBe(1);
        expect(nums[nums.length - 1]).toBe(pageCount);
      }
    }
  });
});
