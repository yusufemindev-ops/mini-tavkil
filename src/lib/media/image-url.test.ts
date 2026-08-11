import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(publicUrl: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', publicUrl);
  return (await import('./image-url')).resolveImageUrl;
}

describe('resolveImageUrl', () => {
  it('prefixes a bare R2 key', async () => {
    const resolve = await load('https://images.example.com');
    expect(resolve('products/abc.webp')).toBe('https://images.example.com/products/abc.webp');
  });

  it('does not double the slash', async () => {
    const resolve = await load('https://images.example.com/');
    expect(resolve('/products/abc.webp')).toBe('https://images.example.com/products/abc.webp');
  });

  it('passes an absolute URL through untouched', async () => {
    // The seeded catalogue holds absolute URLs, and an admin may paste one.
    const resolve = await load('https://images.example.com');
    expect(resolve('https://other.example/x.png')).toBe('https://other.example/x.png');
    expect(resolve('http://other.example/x.png')).toBe('http://other.example/x.png');
  });

  it('passes a data URL through untouched', async () => {
    const resolve = await load('https://images.example.com');
    expect(resolve('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('returns the key unchanged when no public URL is configured', async () => {
    // Better a relative path than the string "undefined/products/abc.webp".
    const resolve = await load('');
    expect(resolve('products/abc.webp')).toBe('products/abc.webp');
  });

  it('returns empty for empty', async () => {
    const resolve = await load('https://images.example.com');
    expect(resolve('')).toBe('');
  });

  it('is why the host swap in step 15 needs no migration', async () => {
    // The same stored key resolves against whichever host is configured — this is
    // the entire reason uploads store a key rather than a URL.
    const key = 'products/abc.webp';
    expect(await (await load('https://pub-xyz.r2.dev'))(key)).toBe(
      'https://pub-xyz.r2.dev/products/abc.webp',
    );
    expect(await (await load('https://images.tavkil.com'))(key)).toBe(
      'https://images.tavkil.com/products/abc.webp',
    );
  });
});
