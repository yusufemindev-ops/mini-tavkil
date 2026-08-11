/**
 * Browser-side image optimisation, ported from Temsan.
 *
 * This exists because Sharp cannot run on Cloudflare Workers and a WASM encoder
 * would not fit inside the 3 MB bundle. So the admin does the work the server
 * normally would: decode with `createImageBitmap`, draw to a canvas at the target
 * size, and re-encode as WebP. The Worker then only ever checks and stores bytes —
 * it never decodes an image.
 *
 * The trade-off is one size per image rather than Tavkil's four variants. For a
 * showcase that is fine; if responsive sizes matter later they belong at delivery
 * (Cloudflare Image Resizing), not here.
 */
export interface ResizeOptions {
  /** Longest side, in pixels. */
  maxDim?: number;
  quality?: number;
}

export async function resizeToWebp(
  file: File,
  { maxDim = 1600, quality = 0.8 }: ResizeOptions = {},
): Promise<File> {
  // An animated GIF or a format the browser can't decode throws here; the caller
  // falls back to the original file rather than losing the upload.
  const bitmap = await createImageBitmap(file);

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image (no canvas context).');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error('Could not convert the image to WebP.');

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
}
