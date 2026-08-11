import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findLeaks, formatLeaks } from './no-leak';

// This suite runs with no database. It guards the two things that don't need one:
// the leak walker itself, and the source of the public query module — which is the
// only file allowed to build a query a public page can reach. If a price or
// supplier column is never named here, it cannot be selected here.
//
// The behavioural half (calling the functions and scanning real rows) lives in
// public-product.integration.test.ts.

const source = readFileSync(fileURLToPath(new URL('./public-product.ts', import.meta.url)), 'utf8');

// Comments explain *why* these columns are banned, so strip them before grepping —
// otherwise the documentation trips its own test.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, ''))
  .join('\n');

describe('public-product.ts source', () => {
  it.each([
    'basePriceAmount',
    'basePriceCurrency',
    'basePriceUpdatedAt',
    'basePriceUpdatedBy',
    'supplierId',
    'suppliers',
    'supplierTranslations',
    'currencies',
  ])('never references %s', (identifier) => {
    expect(code).not.toContain(identifier);
  });

  it('imports only catalogue tables from the schema', () => {
    const importBlock = /from '@\/lib\/db\/schema'/.test(code)
      ? code.slice(code.indexOf('import {'), code.indexOf("from '@/lib/db/schema'"))
      : '';
    expect(importBlock).not.toMatch(/supplier/i);
    expect(importBlock).not.toMatch(/currenc/i);
  });

  it('filters on published and not-deleted', () => {
    expect(code).toContain("eq(products.status, 'published')");
    expect(code).toContain('isNull(products.deletedAt)');
    expect(code).toContain("eq(categories.status, 'published')");
    expect(code).toContain('isNull(categories.deletedAt)');
  });

  it('requires a complete translation rather than falling back to English', () => {
    expect(code).toContain('eq(productTranslations.isComplete, true)');
    expect(code).toContain('eq(categoryTranslations.isComplete, true)');
  });

  it('never stamps lastModified with the current time', () => {
    // The sitemap's lastModified comes from the row. `new Date(row.updatedAt)` is
    // fine; a bare `new Date()` is the bug.
    expect(code).not.toMatch(/new Date\(\s*\)/);
  });
});

describe('findLeaks', () => {
  it('passes a clean product-shaped object', () => {
    expect(
      findLeaks({
        slug: 'bucket',
        name: 'Bucket',
        images: [{ url: 'https://x/y.webp', alt: 'A bucket', isPrimary: true }],
        category: { slug: 'cleaning', name: 'Cleaning' },
        updatedAt: new Date(),
      }),
    ).toEqual([]);
  });

  it('catches a price key nested inside an array', () => {
    const hits = findLeaks({
      variants: [{ label: 'S' }, { label: 'M', basePriceAmount: '12.00' }],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe('variants[1].basePriceAmount');
  });

  it('catches a supplier key at any depth', () => {
    const hits = findLeaks({ a: { b: { c: { supplierId: 'uuid' } } } });
    expect(formatLeaks(hits)).toContain('a.b.c.supplierId');
  });

  it('catches a supplier name leaked as a plain string value', () => {
    const hits = findLeaks({ description: 'Made by Anatolia Chemicals in Istanbul.' }, [
      'Anatolia Chemicals',
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe('description');
  });

  it('survives a cyclic object', () => {
    const node: Record<string, unknown> = { name: 'ok' };
    node.self = node;
    expect(() => findLeaks(node)).not.toThrow();
  });

  it('does not walk into Date internals', () => {
    expect(findLeaks({ updatedAt: new Date('2026-01-01') })).toEqual([]);
  });
});

/**
 * Every image reference stored in this database is a bare R2 key, so every one
 * of them has to be resolved before it reaches a page.
 *
 * Product images always were. Category images and option swatches were not, and
 * nothing caught it because no row had ever had one — the storefront fell
 * through to a gradient placeholder and looked deliberate. Populating those
 * columns turned all sixteen category cards and every rail pill into a broken
 * image at once.
 *
 * A source check rather than a behavioural one, matching the leak guard above:
 * the mistake is *returning the column*, and that is visible in the text.
 */
describe('image references reaching a public shape', () => {
  it('never returns a stored image column straight from a row', () => {
    // A bare hand-off ends the property: `imageUrl: row.imageUrl,`. Requiring the
    // comma is what separates it from `row.imageUrl ? resolveImageUrl(...) : null`,
    // where the same text appears as the ternary's condition.
    const raw = [...code.matchAll(/imageUrl:\s*(?:row|image)\.imageUrl\s*,/g)].map((m) => m[0]);
    expect(raw, 'resolve these through resolveImageUrl()').toEqual([]);
  });

  it('resolves the image columns it does select', () => {
    // Selecting the column is fine; every select must have a matching resolve.
    const selects = [...code.matchAll(/imageUrl:\s*\w+\.imageUrl,/g)].length;
    const resolves = [...code.matchAll(/resolveImageUrl\(/g)].length;
    expect(selects, 'a selected image column with nothing resolving it').toBeGreaterThan(0);
    expect(resolves).toBeGreaterThanOrEqual(2);
  });
});
