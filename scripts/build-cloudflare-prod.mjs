import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const envFile = '.env.prod';
if (!existsSync(envFile)) {
  console.error(`❌ ${envFile} not found — required for production build.`);
  process.exit(1);
}

// Injects production environment into process.env so Next.js inlines prod URLs during build.
process.loadEnvFile(envFile);

console.log('🚀 Building Cloudflare Worker bundle with production environment (.env.prod)...');
execSync('opennextjs-cloudflare build && node scripts/strip-build-secrets.mjs', {
  stdio: 'inherit',
  env: process.env,
});
