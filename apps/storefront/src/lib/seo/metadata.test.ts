import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `buildMetadata` now reads the site settings for the default share image.
 * These tests are about hreflang and robots, so the settings are stubbed rather
 * than reached for — otherwise every case here would need a database.
 */
vi.mock('@/lib/settings', () => ({
  getSiteSettings: async () => ({ ogImageUrl: '' }),
}));

const base = {
  locale: 'tr',
  path: '/product/widget',
  title: 'Widget · Tavkil',
  description: 'A widget.',
};

// SITE_INDEXABLE is read at module scope, so each block re-imports the module with
// the env var set the way that block needs it.
async function loadWith(indexable: boolean) {
  vi.resetModules();
  vi.stubEnv('SITE_INDEXABLE', indexable ? 'true' : 'false');
  return import('./metadata');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('buildMetadata hreflang alternates', () => {
  let buildMetadata: (typeof import('./metadata'))['buildMetadata'];

  beforeEach(async () => {
    ({ buildMetadata } = await loadWith(true));
  });

  it('advertises every configured locale by default (static pages)', async () => {
    const languages = (await buildMetadata(base)).alternates?.languages ?? {};
    expect(Object.keys(languages).sort()).toEqual(['ar', 'en', 'tr', 'x-default']);
    expect(languages['x-default']).toContain('/en/product/widget');
  });

  it('advertises only the locales that have a real translation', async () => {
    const languages =
      (await buildMetadata({ ...base, alternateLocales: ['en', 'tr'] })).alternates?.languages ??
      {};
    // ar has no complete translation here, so it must not be linked as an alternate.
    expect(Object.keys(languages).sort()).toEqual(['en', 'tr', 'x-default']);
    expect(languages).not.toHaveProperty('ar');
  });

  it('keeps x-default on the en URL even for an en-only entity', async () => {
    const languages =
      (await buildMetadata({ ...base, alternateLocales: ['en'] })).alternates?.languages ?? {};
    expect(Object.keys(languages).sort()).toEqual(['en', 'x-default']);
    expect(languages['x-default']).toContain('/en/product/widget');
  });

  it('ignores unknown locale codes', async () => {
    const languages =
      (await buildMetadata({ ...base, alternateLocales: ['en', 'de', 'fr'] })).alternates
        ?.languages ?? {};
    expect(Object.keys(languages).sort()).toEqual(['en', 'x-default']);
  });

  it('points each alternate at that locale’s own slug', async () => {
    const languages =
      (
        await buildMetadata({
          ...base,
          localizedPaths: {
            en: '/catalogue/cleaning',
            tr: '/catalogue/temizlik',
            ar: '/catalogue/tanzif',
          },
        })
      ).alternates?.languages ?? {};
    expect(languages.en).toContain('/en/catalogue/cleaning');
    expect(languages.tr).toContain('/tr/catalogue/temizlik');
    expect(languages.ar).toContain('/ar/catalogue/tanzif');
  });

  it('canonicalises to the page’s own locale, never cross-locale', async () => {
    const meta = await buildMetadata({
      ...base,
      localizedPaths: { en: '/catalogue/cleaning', tr: '/catalogue/temizlik' },
    });
    expect(meta.alternates?.canonical).toContain('/tr/catalogue/temizlik');
  });
});

describe('buildMetadata robots', () => {
  it('omits robots for an indexable page on an indexable deployment', async () => {
    const { buildMetadata } = await loadWith(true);
    expect((await buildMetadata(base)).robots).toBeUndefined();
  });

  it('emits noindex,follow for a page flagged not-indexable', async () => {
    const { buildMetadata } = await loadWith(true);
    expect((await buildMetadata({ ...base, index: false })).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it('forces noindex on every page while SITE_INDEXABLE is false', async () => {
    const { buildMetadata } = await loadWith(false);
    // The per-page flag must not be able to override the deployment-wide switch —
    // an indexed workers.dev URL is very hard to undo.
    expect((await buildMetadata({ ...base, index: true })).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});
