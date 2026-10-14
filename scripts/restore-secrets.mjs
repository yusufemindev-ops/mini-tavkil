/**
 * Re-upload the production secrets to the Worker from the local `.env.production`.
 *
 * The values are read from `.env.production` and piped straight into `wrangler secret
 * bulk`; nothing is printed, and the temporary JSON is deleted.
 *
 *   pnpm secrets:restore:prod
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Exactly the keys `wrangler.jsonc` documents as production secrets. Listed
 * rather than "everything in .env" so a local-only variable — `DIRECT_URL` is
 * for drizzle-kit over TCP, which a Worker cannot open — never gets uploaded as
 * a binding the runtime would be wrong to have.
 */
const SECRETS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ADMIN_ALLOWLIST',
  'INDEXNOW_API_KEY',
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Tolerate quoted values; a stray quote uploaded verbatim breaks the secret
    // in a way that only shows up as a runtime auth failure.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const ENV_FILE = '.env.prod';
if (!existsSync(ENV_FILE)) {
  console.error(`${ENV_FILE} not found — it holds the production values this uploads.`);
  process.exit(1);
}
const env = parseEnv(readFileSync(ENV_FILE, 'utf8'));

const payload = {};
const missing = [];
for (const key of SECRETS) {
  if (env[key]) payload[key] = env[key];
  else missing.push(key);
}

if (missing.length > 0) {
  console.error(`Missing from ${ENV_FILE}: ${missing.join(', ')}`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'tavkil-secrets-'));
const file = join(dir, 'secrets.json');

try {
  writeFileSync(file, JSON.stringify(payload), { mode: 0o600 });
  console.log(
    `Uploading ${Object.keys(payload).length} secrets: ${Object.keys(payload).join(', ')}`,
  );
  execFileSync('pnpm', ['exec', 'wrangler', 'secret', 'bulk', file], { stdio: 'inherit' });
} finally {
  // Always, including on a failed upload — the file holds every production
  // credential in plaintext.
  rmSync(dir, { recursive: true, force: true });
}
