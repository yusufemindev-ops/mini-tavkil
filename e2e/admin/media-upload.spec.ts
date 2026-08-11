import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * The admin image upload, driven through the real dropzone.
 *
 * This was the last unexercised path in the project, and it is the one that
 * cannot be proven any other way. `pnpm import:temsan` also writes to R2, so 243
 * photographs serving from the bucket says the *bucket* works — it says nothing
 * about the browser half, which is where the interesting failure lives:
 *
 *   Workers cannot run Sharp or any native image library (CLAUDE.md §2), so the
 *   resize happens in the page, on a canvas, before the bytes are ever sent. The
 *   file a person picks is a PNG or a JPEG; what reaches R2 must be WebP. If that
 *   conversion silently no-ops, everything still "works" — the upload succeeds,
 *   the image renders — and the bucket quietly fills with full-size originals.
 *
 * So this asserts on what came back out: the stored object is served as WebP, and
 * it is materially smaller than the file that went in.
 *
 * Everything created here is prefixed `e2e-` and deleted in the same test, pass
 * or fail. One database, no staging (CLAUDE.md §7). The R2 object itself outlives
 * the test — there is no delete endpoint for media, by design, since an image can
 * be referenced by more than one row — so the fixture is deliberately tiny.
 */

const RUN = `e2e-media-${Date.now().toString(36)}`;

/**
 * A PNG built here rather than committed as a binary fixture, so the dimensions
 * are visible in the diff and the file cannot drift from what the test claims.
 * Large enough that a downscale to WebP is unmistakable in the byte count.
 */
function png(width: number, height: number): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      // A coarse checker in the brand orange. Flat colour would compress to
      // almost nothing and make the size comparison meaningless.
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
    // "Save changes" on a published product, "Save as draft" on one that is not.
    // A fresh product is always a draft, so matching only the former waits out the
    // timeout on a page that loaded perfectly well.
    const save = page.getByRole('button', { name: /^Save (changes|as draft)$/ });
    await expect(save).toBeVisible({ timeout: 20_000 });

    // The input is hidden behind a styled dropzone; Playwright sets files on it
    // regardless, which is the same event the click-then-pick flow produces.
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

    // And it survives a save, which is where the alt-text record broke before.
    //
    // Waiting on the write itself rather than on the click. Reading the product
    // back immediately after clicking raced the request and failed once before
    // passing on retry — a flake that would have been rerun-until-green forever
    // rather than read as "the assertion is watching the wrong thing".
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
