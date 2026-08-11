/**
 * Identifies an image by its actual bytes.
 *
 * The declared `Content-Type` on a multipart part is attacker-controlled — it is
 * whatever the client typed. Trusting it means an SVG (or anything else) arrives
 * labelled `image/png`, gets stored, and is later served from the images host with
 * that content type. So the format is decided here, by the magic bytes, and the
 * declared type is only ever used to reject early.
 *
 * **SVG is not in this list on purpose.** It is XML, it can carry `<script>`, and
 * it is served from a host we treat as trusted — it is a stored-XSS vector, not an
 * image format (PLAN.md §14h). There is no sniff for it because there is no case
 * where we want one.
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const ALLOWED_FORMATS: readonly ImageFormat[] = ['jpeg', 'png', 'webp'];

const CONTENT_TYPE: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXTENSION: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** The format these bytes actually are, or null if it isn't one we accept. */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  // \x89 P N G \r \n \x1a \n
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';

  // JPEG: SOI marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';

  // WebP is a RIFF container: "RIFF" <4-byte size> "WEBP". Both halves must match
  // — "RIFF" alone is also WAV and AVI.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'webp';

  return null;
}

export function contentTypeFor(format: ImageFormat): string {
  return CONTENT_TYPE[format];
}

export function extensionFor(format: ImageFormat): string {
  return EXTENSION[format];
}
