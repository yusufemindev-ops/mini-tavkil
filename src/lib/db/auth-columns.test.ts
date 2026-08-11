import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { authAccount, authSession, authUser, authVerification } from './schema';

/**
 * The four auth* tables use **camelCase** column names in Postgres, because
 * Tavkil's Prisma models never mapped them — every other table in this database
 * is snake_case.
 *
 * `src/lib/db.ts` sets `casing: 'snake_case'`, which rewrites any property that
 * doesn't state its column name explicitly. That silently turned `expiresAt` into
 * `expires_at`, a column that does not exist, and Google sign-in failed with a
 * 500 on the first insert Better Auth attempted.
 *
 * It survived every other test because nothing else touched a multi-word auth
 * column: the leak suite reads catalogue tables, and the admin guard only ever
 * read `authUser.email` and `.banned`, both single words. So this test exists to
 * assert the shape directly rather than wait for the next flow that happens to
 * use one.
 */
const TABLES = {
  authUser,
  authSession,
  authAccount,
  authVerification,
};

describe('auth tables keep camelCase column names', () => {
  it.each(Object.entries(TABLES))('%s', (_name, table) => {
    const columns = Object.values(getTableColumns(table));
    const snakeCased = columns.map((c) => c.name).filter((name) => name.includes('_'));
    expect(snakeCased, 'these columns do not exist in Postgres').toEqual([]);
  });

  it('the columns Better Auth writes on sign-in resolve correctly', () => {
    // The exact insert that was failing.
    const columns = Object.values(getTableColumns(authVerification)).map((c) => c.name);
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt']),
    );
  });

  it('the catalogue tables are still snake_case — the casing option is load-bearing', async () => {
    // Removing `casing: 'snake_case'` would have been the other "fix"; this is
    // why it isn't. These tables genuinely rely on it or on explicit names.
    const { products, productTranslations } = await import('./schema');
    const productColumns = Object.values(getTableColumns(products)).map((c) => c.name);
    expect(productColumns).toContain('base_price_amount');
    expect(productColumns).toContain('category_id');
    expect(Object.values(getTableColumns(productTranslations)).map((c) => c.name)).toContain(
      'product_id',
    );
  });
});
