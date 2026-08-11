import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import messages from '../../../messages/en.json';
import { ProductGallery } from './product-gallery';
import type { PublicImage } from '@/lib/queries/public-product';

/**
 * The gallery's interactive parts can't be verified against the live site: every
 * seeded product carries exactly one image, so the thumbnail strip never renders
 * there, and no product has options either. These tests exercise the multi-image
 * case the data doesn't currently produce — which is precisely the code that was
 * dropped once and had to be restored from Tavkil.
 */
const image = (n: number): PublicImage => ({
  url: `https://example.test/${n}.webp`,
  alt: `Alt ${n}`,
  isPrimary: n === 1,
});

function renderGallery(images: PublicImage[], productName = 'Degreaser 5L') {
  const { container } = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProductGallery images={images} productName={productName} />
    </NextIntlClientProvider>,
  );
  // Queried by position rather than by role: the main image is deliberately
  // `alt=""` when its alt only repeats the product name, and an empty alt maps to
  // role="presentation", which getByRole('img') cannot see.
  return {
    container,
    mainImage: () => container.querySelectorAll('img')[images.length > 1 ? images.length : 0],
  };
}

describe('ProductGallery', () => {
  it('renders no thumbnail strip for a single image', () => {
    const { mainImage } = renderGallery([image(1)]);
    expect(screen.queryByRole('button', { name: 'View image 1' })).not.toBeInTheDocument();
    expect(mainImage()).toHaveAttribute('src', 'https://example.test/1.webp');
  });

  it('renders one thumbnail per image and swaps the main panel on click', () => {
    const { mainImage } = renderGallery([image(1), image(2), image(3)]);

    const thumbs = [1, 2, 3].map((n) => screen.getByRole('button', { name: `View image ${n}` }));
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAttribute('aria-pressed', 'true');
    expect(mainImage()).toHaveAttribute('src', 'https://example.test/1.webp');

    fireEvent.click(thumbs[2]);

    expect(thumbs[2]).toHaveAttribute('aria-pressed', 'true');
    expect(thumbs[0]).toHaveAttribute('aria-pressed', 'false');
    expect(mainImage()).toHaveAttribute('src', 'https://example.test/3.webp');
  });

  it('marks the main image decorative when its alt only repeats the product name', () => {
    // The <h1> beside the gallery already announces the name; repeating it makes
    // a screen reader say it twice.
    const { mainImage } = renderGallery([
      { url: 'https://example.test/1.webp', alt: 'Degreaser 5L', isPrimary: true },
    ]);
    expect(mainImage()).toHaveAttribute('alt', '');
  });

  it('keeps a real alt when the admin wrote something more specific', () => {
    const { mainImage } = renderGallery([
      { url: 'https://example.test/1.webp', alt: 'Rear label', isPrimary: true },
    ]);
    expect(mainImage()).toHaveAttribute('alt', 'Rear label');
  });

  it('offers the Images/Video switch with Video disabled — no product carries video', () => {
    renderGallery([image(1)]);
    expect(screen.getByRole('button', { name: 'Images' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Video' })).toBeDisabled();
  });

  it('survives an empty image list', () => {
    // publicProduct() can return a product whose images were all deleted.
    const { container } = renderGallery([]);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
