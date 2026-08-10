import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The public/admin split only holds if nothing under the public route tree imports
 * an admin query. Types alone can't enforce that — `adminProduct()` is perfectly
 * well-typed, it just returns a price. So the boundary is a test.
 *
 * If a future page genuinely needs a new field, add it to the public shape
 * deliberately (CLAUDE.md §1) rather than reaching for the admin module.
 */

const SRC = join(process.cwd(), 'src');

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const PUBLIC_TREES = [join(SRC, 'app', '[locale]'), join(SRC, 'components')];
const ADMIN_ONLY_IMPORT =
  /from\s+['"](@\/lib\/queries\/admin-[\w-]+|\.\/admin-[\w-]+|@\/lib\/services\/(?!catalog-schemas|settings-schema|publish-gates)[\w-]+)['"]/;
const DIRECT_SCHEMA_TABLE = /\b(suppliers|supplierTranslations)\b/;

describe('public route tree', () => {
  const files = PUBLIC_TREES.flatMap(filesUnder);

  it('has files to check (the globs did not go stale)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.replace(SRC, 'src'), f]))(
    '%s imports no admin query module',
    (_label, file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(ADMIN_ONLY_IMPORT);
    },
  );

  it.each(files.map((f) => [f.replace(SRC, 'src'), f]))(
    '%s does not name a supplier table',
    (_label, file) => {
      expect(stripComments(readFileSync(file, 'utf8'))).not.toMatch(DIRECT_SCHEMA_TABLE);
    },
  );
});

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/**
 * Modules that must stay reachable without a database.
 *
 * Each of these is pure policy, schema, or error shape. Every one of them ended up
 * transitively importing `@/lib/db` at some point during step 8, and each time the
 * symptom was the same: a unit test that touches none of this fails at import with
 * `DATABASE_URL is not set`, because `lib/db` throws at module scope. Listing them
 * turns "someone will notice" into a failing test.
 */
const MUST_STAY_PURE = [
  'lib/api/errors.ts',
  'lib/permissions/allowlist.ts',
  'lib/permissions/catalog.ts',
  'lib/catalog/product-sort.ts',
  'lib/services/publish-gates.ts',
  'i18n/routing.ts',
  // Every validation module, matched by name rather than listed — the rule kept
  // being rediscovered one file at a time.
  ...filesUnder(join(SRC, 'lib', 'services'))
    .filter((file) => /-schemas?\.ts$/.test(file))
    .map((file) => file.slice(SRC.length + 1)),
];

describe('dependency-free modules', () => {
  it.each(MUST_STAY_PURE)('%s reaches no database module, even transitively', async (relative) => {
    const seen = new Set<string>();
    const banned: string[] = [];

    const walk = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        return;
      }
      for (const match of stripComments(source).matchAll(
        /(?:^|\n)\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/g,
      )) {
        const spec = match[1];
        if (/^(@\/lib\/db|drizzle-orm|@neondatabase\/serverless|better-auth)/.test(spec)) {
          banned.push(`${file.replace(SRC, 'src')} → ${spec}`);
          continue;
        }
        if (!spec.startsWith('@/')) continue; // node_modules — not ours to police
        const resolved = join(SRC, spec.slice(2));
        for (const candidate of [`${resolved}.ts`, `${resolved}.tsx`, join(resolved, 'index.ts')]) {
          try {
            statSync(candidate);
            walk(candidate);
            break;
          } catch {
            /* try the next extension */
          }
        }
      }
    };

    walk(join(SRC, relative));
    expect(banned).toEqual([]);
  });
});

/**
 * A Client Component that imports a module which imports `@/lib/db` drags Drizzle,
 * the whole schema, and `throw new Error('DATABASE_URL is not set')` into the
 * browser bundle — where that throw fires on load and blanks the page.
 *
 * This happened once: the sort dropdown imported its option list from
 * `lib/queries/public-product`. The constants now live in
 * `lib/catalog/product-sort`, which touches nothing. `import type` is fine — types
 * are erased — so only value imports are checked.
 */
describe("'use client' modules", () => {
  const clientFiles = filesUnder(SRC).filter((file) =>
    /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')),
  );

  // A value import (not `import type`) of a server-only module.
  const SERVER_ONLY_VALUE_IMPORT =
    /import\s+(?!type\b)[^;]*?from\s+['"](@\/lib\/db(?:\/[\w-]+)?|@\/lib\/queries\/[\w-]+|@\/lib\/settings|drizzle-orm(?:\/[\w-]+)?|@neondatabase\/serverless)['"]/;

  it('found some client components (the scan did not go stale)', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it.each(clientFiles.map((f) => [f.replace(SRC, 'src'), f]))(
    '%s pulls in no database module',
    (_label, file) => {
      expect(stripComments(readFileSync(file, 'utf8'))).not.toMatch(SERVER_ONLY_VALUE_IMPORT);
    },
  );
});
