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
const ADMIN_ONLY_IMPORT = /from\s+['"](@\/lib\/queries\/admin-[\w-]+|\.\/admin-[\w-]+)['"]/;
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
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, ''))
        .join('\n');
      expect(code).not.toMatch(DIRECT_SCHEMA_TABLE);
    },
  );
});
