import { execFile } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Uploads the prepared Temsan product photographs to the `tavkil-images` R2 bucket.
 *
 * The images are already web-ready — 1600px WebP, about 134 KB each — because
 * Workers cannot run Sharp, so nothing resizes them after upload. That is the same
 * rule the admin's browser-side uploader follows (lib/image-resize.ts).
 *
 * Keys match what `data.json` records and what the database stores:
 * `products/temsan/<code>-<n>.webp`. The database holds the bare key, never an
 * absolute URL — see lib/media/image-url.ts.
 *
 *   node scripts/temsan/upload-images.mjs <directory-of-webp-files>
 *
 * Re-running is safe: R2 `put` overwrites the same key.
 *
 * Uploads run a few at a time. Each `wrangler r2 object put` spends about two
 * seconds on process start and auth before it transfers anything, so 243 of them
 * in sequence is ten minutes of mostly waiting.
 */

const BUCKET = 'tavkil-images';
const PREFIX = 'products/temsan';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/temsan/upload-images.mjs <directory-of-webp-files>');
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.webp'))
  .sort();

if (files.length === 0) {
  console.error(`no .webp files in ${dir}`);
  process.exit(1);
}

const totalBytes = files.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
console.log(`uploading ${files.length} images (${(totalBytes / 1e6).toFixed(1)} MB) to ${BUCKET}`);

const CONCURRENCY = 8;
let done = 0;
const failed = [];

function put(file) {
  const key = `${PREFIX}/${file}`;
  return new Promise((resolve) => {
    execFile(
      'pnpm',
      [
        'exec',
        'wrangler',
        'r2',
        'object',
        'put',
        `${BUCKET}/${key}`,
        '--file',
        join(dir, file),
        '--content-type',
        'image/webp',
        // The bucket is production; there is no preview bucket (CLAUDE.md §7).
        '--remote',
      ],
      (error, _stdout, stderr) => {
        if (error) failed.push({ file, message: String(stderr || error).slice(0, 200) });
        else done += 1;
        if ((done + failed.length) % 20 === 0) {
          console.log(`  ${done + failed.length}/${files.length}`);
        }
        resolve();
      },
    );
  });
}

const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) await put(file);
  }),
);

console.log(`uploaded ${done}/${files.length}`);
if (failed.length) {
  console.error(`\n${failed.length} failed:`);
  for (const f of failed) console.error(`  ${f.file}: ${f.message}`);
  process.exit(1);
}
