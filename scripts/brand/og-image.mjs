/**
 * Render the social preview card and the iOS home-screen icon.
 *
 * These are brand assets, so they are generated from the same geometry the site
 * draws rather than hand-exported from a design tool and drifting from it: the
 * seal here is the path from `src/app/icon.svg`, and the colour is the one
 * `--primary` resolves to. Regenerate after either changes.
 *
 *   pnpm exec node scripts/brand/og-image.mjs [outDir]
 *
 * A screenshot rather than `next/og`: ImageResponse pulls satori and resvg into
 * the Worker bundle, and this project has ~600 KB of headroom under Cloudflare's
 * 3 MB limit (CLAUDE.md §2). A PNG committed once costs the bundle nothing.
 *
 * Fonts are the system stack on purpose. A webfont `@import` inside a headless
 * render is a network dependency that fails silently and falls back to Times —
 * and the wordmark is the one thing that must not be wrong.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ORANGE = '#f2640c';
/** The seal, from src/app/icon.svg — kept identical so the marks match. */
const SEAL_RING = 'M19 23.5h26v9.5h-8v20h-10v-20h-8Z';

const out = process.argv[2] ?? join(process.cwd(), 'scripts', 'brand', 'out');
mkdirSync(out, { recursive: true });

const card = `<!doctype html><meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{background:${ORANGE};display:flex;flex-direction:column;align-items:center;
       justify-content:center;gap:40px;color:#fff;position:relative;
       font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
  /* A single soft highlight, so a flat slab has some depth in a chat preview
     without introducing a second colour. */
  body::after{content:'';position:absolute;inset:0;
    background:radial-gradient(120% 120% at 22% 18%,rgba(255,255,255,.15),transparent 60%)}
  .lockup{display:flex;align-items:center;gap:40px;z-index:1}
  svg{width:190px;height:190px;display:block}
  .word{font-size:150px;font-weight:800;letter-spacing:-.05em;line-height:1}
  /* The dotless i with its own square dot — the wordmark's one deliberate
     detail, matching the storefront's .brand-i-dot.
     Centred on the stem with translateX rather than nudged from the left edge:
     the offset version sat visibly adrift of the letter at this size. */
  .i{position:relative;display:inline-block}
  .i span{position:absolute;left:50%;transform:translateX(-50%);top:-.02em;
          width:.14em;height:.14em;border-radius:.03em;background:#fff}
  .tag{z-index:1;font-size:34px;font-weight:600;color:rgba(255,255,255,.93)}
</style>
<div class="lockup">
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="#fff"/>
    <circle cx="32" cy="32" r="24.5" fill="none" stroke="${ORANGE}" stroke-width="3" opacity=".45"/>
    <path d="${SEAL_RING}" fill="${ORANGE}"/>
  </svg>
  <div class="word">tavk<span class="i">ı<span></span></span>l</div>
</div>
<div class="tag">Wholesale suppliers in Türkiye</div>`;

const appleIcon = `<!doctype html><meta charset="utf-8"/>
<style>*{margin:0}body{width:180px;height:180px;background:${ORANGE}}</style>
<svg width="180" height="180" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="24.5" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>
  <path d="${SEAL_RING}" fill="#fff"/>
</svg>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(card);
  await page.screenshot({ path: join(out, 'opengraph-image.png') });

  // iOS masks this to a rounded square and dislikes transparency, so it is a
  // filled tile carrying the ring and the T rather than the circular disc —
  // a disc would leave four dead corners once masked.
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.setContent(appleIcon);
  await icon.screenshot({ path: join(out, 'apple-icon.png') });

  console.log(`Wrote opengraph-image.png (1200×630) and apple-icon.png (180×180) to ${out}`);
} finally {
  await browser.close();
}
