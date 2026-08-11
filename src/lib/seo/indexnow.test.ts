import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load({ indexable = true, base = 'https://tavkil.com', key = 'abc123' } = {}) {
  vi.resetModules();
  vi.stubEnv('SITE_INDEXABLE', indexable ? 'true' : 'false');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', base);
  vi.stubEnv('INDEXNOW_API_KEY', key);
  return import('./indexnow');
}

describe('urlsFor', () => {
  it('emits one URL per locale that has a slug', async () => {
    const { urlsFor } = await load();
    const urls = urlsFor({
      type: 'product',
      slugs: { en: 'bath-towels', tr: 'banyo-havlulari', ar: 'مناشف-حمام' },
    });
    expect(urls).toContain('https://tavkil.com/en/product/bath-towels');
    expect(urls).toContain('https://tavkil.com/tr/product/banyo-havlulari');
    expect(urls).toContain('https://tavkil.com/ar/product/مناشف-حمام');
  });

  it('skips a locale with no slug rather than emitting a broken URL', async () => {
    const { urlsFor } = await load();
    const urls = urlsFor({ type: 'product', slugs: { en: 'x', tr: undefined, ar: '' } });
    expect(urls.some((u) => u.includes('/tr/product/'))).toBe(false);
    expect(urls.some((u) => u.includes('/ar/product/'))).toBe(false);
  });

  it('ignores a locale the site does not serve', async () => {
    const { urlsFor } = await load();
    const urls = urlsFor({ type: 'product', slugs: { en: 'x', de: 'y' } });
    expect(urls.some((u) => u.includes('/de/'))).toBe(false);
  });

  it('includes the catalogue listing pages, which the change also affects', async () => {
    // Submitting only the product URL leaves the listing pages showing a stale
    // cached copy in the index.
    const { urlsFor } = await load();
    const urls = urlsFor({ type: 'product', slugs: { en: 'x' } });
    for (const locale of ['en', 'tr', 'ar']) {
      expect(urls).toContain(`https://tavkil.com/${locale}/catalogue`);
    }
  });

  it('uses the category prefix for a category', async () => {
    const { urlsFor } = await load();
    const urls = urlsFor({ type: 'category', slugs: { en: 'cleaning' } });
    expect(urls).toContain('https://tavkil.com/en/catalogue/cleaning');
  });

  it('deduplicates', async () => {
    const { urlsFor } = await load();
    const urls = urlsFor({ type: 'category', slugs: { en: 'catalogue' } });
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('submitToIndexNow', () => {
  it('does nothing while the site is not indexable', async () => {
    // Submitting a noindex URL is ignored at best, and at worst teaches the
    // engine the feed is unreliable.
    const { submitToIndexNow } = await load({ indexable: false });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await submitToIndexNow(['https://tavkil.com/en'])).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does nothing without a key', async () => {
    const { submitToIndexNow } = await load({ key: '' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await submitToIndexNow(['https://tavkil.com/en'])).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does nothing for an empty URL list', async () => {
    const { submitToIndexNow } = await load();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await submitToIndexNow([])).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('posts host, key, keyLocation and the URL list', async () => {
    const { submitToIndexNow } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    expect(await submitToIndexNow(['https://tavkil.com/en/product/x'])).toBe(202);

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.host).toBe('tavkil.com');
    expect(body.key).toBe('abc123');
    expect(body.keyLocation).toBe('https://tavkil.com/abc123.txt');
    expect(body.urlList).toEqual(['https://tavkil.com/en/product/x']);
    fetchSpy.mockRestore();
  });

  it('swallows a network failure — a publish must never fail over this', async () => {
    const { submitToIndexNow } = await load();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(submitToIndexNow(['https://tavkil.com/en'])).resolves.toBeNull();
    fetchSpy.mockRestore();
  });

  it('reports a non-2xx status without throwing', async () => {
    const { submitToIndexNow } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 500 }));
    await expect(submitToIndexNow(['https://tavkil.com/en'])).resolves.toBe(500);
    fetchSpy.mockRestore();
  });
});
