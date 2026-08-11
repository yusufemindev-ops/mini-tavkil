import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BidiText } from './bidi-text';

/**
 * Text out of the database carries its own direction, not the page's.
 *
 * The bug this guards: every variant chip on the Arabic product page rendered its
 * measurement backwards. The column held `2 mm`; the page showed `mm 2`, with the
 * digit measurably to the right of the unit. Nothing was wrong with the data —
 * the chip inherited `dir="rtl"` from the page, so the neutral space between a
 * weak digit and a strong Latin run resolved against the container.
 *
 * It is a whole class of bug rather than one instance: any Latin string inside an
 * RTL page loses its trailing punctuation to the far edge, mirrors its brackets,
 * and splits around digits. A product only reachable in English, a SKU, a brand
 * name, an address — all the same failure.
 */
describe('BidiText', () => {
  it('marks its element dir="auto" so direction comes from the string', () => {
    render(<BidiText>2 mm</BidiText>);
    expect(screen.getByText('2 mm')).toHaveAttribute('dir', 'auto');
  });

  it('renders a span by default and honours `as`', () => {
    const { container } = render(<BidiText>TM-211</BidiText>);
    expect(container.firstElementChild?.tagName).toBe('SPAN');

    const { container: h } = render(<BidiText as="h3">Micro Damp Mop</BidiText>);
    expect(h.firstElementChild?.tagName).toBe('H3');
    expect(h.firstElementChild).toHaveAttribute('dir', 'auto');
  });

  it('passes other props through', () => {
    render(<BidiText className="font-mono">TM-211</BidiText>);
    expect(screen.getByText('TM-211')).toHaveClass('font-mono');
  });
});

/**
 * A source check across the storefront, because the fix has to hold at every site
 * that prints database text — one missed heading is one broken product page.
 *
 * `dir="ltr"` is deliberately treated as a smell here. It is correct only while a
 * value is guaranteed Latin; the moment an option label or brand name is Arabic
 * it becomes the same bug pointing the other way. `auto` is right in both cases.
 */
describe('storefront direction handling', () => {
  const read = (path: string) =>
    readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

  const SITES: { file: string; what: string }[] = [
    { file: './catalog/product-card.tsx', what: 'product name and SKU on a card' },
    { file: './catalog/category-tile.tsx', what: 'category name and description' },
    { file: './catalog/category-filters.tsx', what: 'category name in the filter rail' },
    { file: './product/product-options.tsx', what: 'option names and measurements' },
    { file: './product/product-enquiry-panel.tsx', what: 'minimum order quantity' },
  ];

  it.each(SITES)('$file sets an automatic direction for $what', ({ file }) => {
    expect(read(file)).toContain('dir="auto"');
  });

  it('has no hard-coded dir="ltr" left on database text', () => {
    const offenders = SITES.filter(({ file }) => read(file).includes('dir="ltr"'));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });
});
