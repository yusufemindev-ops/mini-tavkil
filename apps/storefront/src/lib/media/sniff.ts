/**
 * Identifies an image format by its magic bytes rather than the client-supplied `Content-Type`.
 * SVG is intentionally excluded because XML payloads can carry `<script>` (stored XSS).
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
