import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * Tests admin media upload pipeline verifying in-browser canvas resize,
 * WebP conversion, and Cloudflare R2 persistence.
 */

const RUN = `e2e-media-${Date.now().toString(36)}`;

/** Generates an uncompressed checkerboard PNG fixture in memory for upload testing. */
function png(width: number, height: number): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      // Alternating checker pattern for realistic compression testing.
      const on = (Math.floor(x / 40) + Math.floor(y / 40)) % 2 === 0;
      raw[offset] = on ? 242 : 255;
      raw[offset + 1] = on ? 100 : 255;
      raw[offset + 2] = on ? 12 : 255;
      offset += 3;
    }
  }

  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

test('an image picked in the admin is converted to WebP and stored in R2', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const source = png(1600, 1200);
  let productId: string | undefined;

  try {
    const categories = (await (await request.get('/api/admin/categories')).json()).data as {
      id: string;
      parentId: string | null;
    }[];
    const category = categories.find((c) => c.parentId);
    expect(category, 'need a sub-category to file the product under').toBeTruthy();

    const created = await request.post('/api/admin/products', {
      data: {
        sku: `${RUN}-sku`.toUpperCase(),
        categoryId: category!.id,
        moq: 1,
        unit: 'piece',
        translations: [
          { locale: 'en', name: `${RUN} product`, slug: `${RUN}-product`, isComplete: true },
        ],
      },
    });
    expect(created.status(), 'create product').toBe(200);
    productId = ((await created.json()).data as { id: string }).id;

    await page.goto(`/admin/products/${productId}`, { waitUntil: 'load' });
    // Match either save button label depending on draft or published status.
    const save = page.getByRole('button', { name: /^Save (changes|as draft)$/ });
    await expect(save).toBeVisible({ timeout: 20_000 });

    // Populate hidden file input inside dropzone.
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: 'e2e-upload.png', mimeType: 'image/png', buffer: source });

    // The upload is done when a thumbnail pointing at the bucket appears.
    const uploaded = page.locator('img[src*="r2.dev"], img[src*="images."]').first();
    await expect(uploaded).toBeVisible({ timeout: 45_000 });
    const url = await uploaded.getAttribute('src');
    expect(url, 'no stored URL on the thumbnail').toBeTruthy();

    // The conversion is the point: a PNG went in, a WebP must have come out.
    expect(url, 'stored object is not .webp — the canvas conversion no-opped').toMatch(/\.webp$/i);

    const stored = await request.get(url!);
    expect(stored.status(), 'stored object is not readable').toBe(200);
    expect(stored.headers()['content-type']).toContain('webp');

    const storedBytes = (await stored.body()).byteLength;
    expect(
      storedBytes,
      `stored ${storedBytes} bytes against a ${source.byteLength}-byte source — no resize happened`,
    ).toBeLessThan(source.byteLength);

    // Wait for the mutation response before checking persisted state.
    const written = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/products/${productId}`) &&
        response.request().method() !== 'GET' &&
        response.ok(),
      { timeout: 30_000 },
    );
    await save.click();
    await written;
    await expect(page.locator('body')).not.toContainText('[object Object]');

    const reloaded = await request.get(`/api/admin/products/${productId}`);
    const images = ((await reloaded.json()).data as { images?: { url: string }[] }).images ?? [];
    expect(
      images.some((image) => image.url === url),
      'image did not persist',
    ).toBe(true);
  } finally {
    if (productId) {
      const deleted = await request.delete(`/api/admin/products/${productId}`);
      expect([200, 204]).toContain(deleted.status());
    }
  }
});
