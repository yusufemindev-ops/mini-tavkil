import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Removes secret values from the OpenNext build artifact.
 *
 * OpenNext captures `.env` at build time and writes it into
 * `.open-next/cloudflare/next-env.mjs`, so DATABASE_URL (with password),
 * BETTER_AUTH_SECRET and GOOGLE_CLIENT_SECRET end up in plaintext in the bundle.
 *
 * They are never *read* at runtime — `populateProcessEnv` assigns Worker bindings
 * first and only fills gaps with `??=`, and every one of these is a real
 * `wrangler secret`. But a copied or shared build directory would be a full
 * credential dump, so they are blanked here rather than left lying around.
 *
 * Blanking rather than deleting the key is deliberate: `??=` treats `""` as
 * present, so a missing Worker secret still fails loudly at first use instead of
 * silently falling back to a stale build-time value.
 *
 * Only names confirmed to exist as Worker secrets or as non-Worker values are
 * listed. Stripping something the Worker actually needs from `.env` would break
 * production, so this list is deliberately explicit rather than pattern-matched.
 */
const STRIP = [
  // Confirmed via `wrangler secret list`.
  'ADMIN_ALLOWLIST',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'INDEXNOW_API_KEY',
  // Only ever used by local scripts over TCP — the Worker never touches it.
  'DIRECT_URL',
  // Not yet set; will be a Worker secret once Turnstile is configured.
  'TURNSTILE_SECRET_KEY',
];

const target = join(process.cwd(), '.open-next/cloudflare/next-env.mjs');

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
