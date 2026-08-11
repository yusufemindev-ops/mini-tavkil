import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductOptions } from './product-options';
import type { PublicOption } from '@/lib/queries/public-product';

const swatch: PublicOption = {
  name: 'Colour',
  type: 'swatch',
  values: [
    { label: 'Red', imageUrl: null, colorHex: null },
    { label: 'Graphite', imageUrl: null, colorHex: '#333333' },
    { label: 'Blue', imageUrl: 'https://example.test/blue.webp', colorHex: null },
  ],
};

const chips: PublicOption = {
  name: 'Size',
  type: 'select',
  values: [
    { label: '1 L', imageUrl: null, colorHex: null },
    { label: '5 L', imageUrl: null, colorHex: null },
  ],
};

describe('ProductOptions', () => {
  it('renders nothing when there are no options', () => {
    const { container } = render(<ProductOptions options={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('skips an option whose values were all deleted', () => {
    const { container } = render(
      <ProductOptions options={[{ name: 'Colour', type: 'swatch', values: [] }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('selects the first value of each axis so the label line is never empty', () => {
    render(<ProductOptions options={[swatch, chips]} />);
    expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1 L' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves the selection within one axis without touching the other', () => {
    render(<ProductOptions options={[swatch, chips]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));

    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'false');
    // The size axis is independent.
    expect(screen.getByRole('button', { name: '1 L' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders swatches as colour tiles and non-swatches as text chips', () => {
    render(<ProductOptions options={[swatch, chips]} />);
    // A swatch has no text — the colour is the label, exposed via aria-label.
    expect(screen.getByRole('button', { name: 'Red' })).toHaveTextContent('');
    expect(screen.getByRole('button', { name: '5 L' })).toHaveTextContent('5 L');
  });

  it('uses the stored hex, falling back to the colour name', () => {
    render(<ProductOptions options={[swatch]} />);
    expect(screen.getByRole('button', { name: 'Graphite' })).toHaveStyle({
      backgroundColor: '#333333',
    });
    // No hex stored — resolved from the label through COLOR_MAP.
    expect(screen.getByRole('button', { name: 'Red' })).toHaveStyle({ backgroundColor: '#dc2626' });
  });

  it('falls back to the colour tile when a swatch image fails to load', () => {
    render(<ProductOptions options={[swatch]} />);
    const image = screen.getByRole('img', { name: 'Blue' });
    expect(image).toBeInTheDocument();

    fireEvent.error(image);

    // A deleted R2 object must not leave a broken-image icon in the picker.
    expect(screen.queryByRole('img', { name: 'Blue' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveStyle({
      backgroundColor: '#2563eb',
    });
  });
});
