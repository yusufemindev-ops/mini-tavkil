import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Blanks server secret values in `.open-next/cloudflare/next-env.mjs` so credentials are never embedded in the build artifact.
 */
const STRIP = [
  'ADMIN_ALLOWLIST',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'INDEXNOW_API_KEY',
  'INTERNAL_REVALIDATE_SECRET',
  'DIRECT_URL',
  'TURNSTILE_SECRET_KEY',
];

const candidates = [
  join(process.cwd(), 'apps/storefront/.open-next/cloudflare/next-env.mjs'),
  join(process.cwd(), '.open-next/cloudflare/next-env.mjs'),
];
const target = candidates.find((p) => existsSync(p)) ?? candidates[0];

let source;
try {
  source = readFileSync(target, 'utf8');
} catch {
  console.warn(`strip-build-secrets: ${target} not found — skipping.`);
  process.exit(0);
}

let stripped = 0;
for (const key of STRIP) {
  // Matches "KEY":"any value" inside the JSON-ish object literals.
  const pattern = new RegExp(`("${key}":")((?:[^"\\\\]|\\\\.)*)(")`, 'g');
  source = source.replace(pattern, (match, open, value, close) => {
    if (value.length === 0) return match;
    stripped += 1;
    return `${open}${close}`;
  });
}

writeFileSync(target, source);
console.log(`strip-build-secrets: blanked ${stripped} secret value(s) in the Worker bundle.`);
