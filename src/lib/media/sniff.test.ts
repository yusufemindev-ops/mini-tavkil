import { describe, expect, it } from 'vitest';
import { ALLOWED_FORMATS, contentTypeFor, extensionFor, sniffImageFormat } from './sniff';

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const WEBP = concat(ascii('RIFF'), bytes(0x24, 0x00, 0x00, 0x00), ascii('WEBP'), ascii('VP8 '));

describe('sniffImageFormat', () => {
  it.each([
    ['PNG', PNG, 'png'],
    ['JPEG', JPEG, 'jpeg'],
    ['WebP', WEBP, 'webp'],
  ])('identifies %s', (_label, input, expected) => {
    expect(sniffImageFormat(input)).toBe(expected);
  });

  describe('rejects', () => {
    it('an SVG, even though it is an image format', () => {
      // The reason SVG is refused: it is XML, it can carry <script>, and it would
      // be served from the images host we treat as trusted — stored XSS, not an
      // image (PLAN.md §14h).
      expect(sniffImageFormat(ascii('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
      expect(sniffImageFormat(ascii('<?xml version="1.0"?><svg>'))).toBeNull();
    });

    it('an SVG with a leading BOM or whitespace', () => {
      expect(sniffImageFormat(concat(bytes(0xef, 0xbb, 0xbf), ascii('<svg>')))).toBeNull();
      expect(sniffImageFormat(ascii('   \n<svg>'))).toBeNull();
    });

    it('HTML', () => {
      expect(sniffImageFormat(ascii('<!doctype html><script>alert(1)</script>'))).toBeNull();
    });

    it('a GIF — not on the allow-list', () => {
      expect(sniffImageFormat(ascii('GIF89a'))).toBeNull();
    });

    it('other RIFF containers that are not WebP', () => {
      // "RIFF" alone is also WAV and AVI. Checking only the first four bytes
      // would accept an arbitrary media file as an image.
      const wav = concat(ascii('RIFF'), bytes(0x24, 0, 0, 0), ascii('WAVE'));
      const avi = concat(ascii('RIFF'), bytes(0x24, 0, 0, 0), ascii('AVI '));
      expect(sniffImageFormat(wav)).toBeNull();
      expect(sniffImageFormat(avi)).toBeNull();
    });

    it('an empty or truncated file', () => {
      expect(sniffImageFormat(new Uint8Array(0))).toBeNull();
      expect(sniffImageFormat(bytes(0x89, 0x50))).toBeNull();
      // "RIFF" with nothing after it must not read past the end.
      expect(sniffImageFormat(ascii('RIFF'))).toBeNull();
    });

    it('a ZIP or PDF renamed to .png', () => {
      expect(sniffImageFormat(ascii('PK'))).toBeNull();
      expect(sniffImageFormat(ascii('%PDF-1.7'))).toBeNull();
    });

    it('a polyglot that starts with an SVG but claims PNG later', () => {
      expect(sniffImageFormat(concat(ascii('<svg>'), PNG))).toBeNull();
    });
  });
});

describe('format metadata', () => {
  it('maps every allowed format to a content type and extension', () => {
    for (const format of ALLOWED_FORMATS) {
      expect(contentTypeFor(format)).toMatch(/^image\//);
      expect(extensionFor(format)).toMatch(/^[a-z]+$/);
    }
  });

  it('never yields an svg content type', () => {
    // Belt and braces: nothing in this module may produce image/svg+xml, since
    // that is the header that would make a stored file execute.
    for (const format of ALLOWED_FORMATS) {
      expect(contentTypeFor(format)).not.toContain('svg');
    }
  });
});
