# mini-tavkil — Day 1 runbook

> Goal: **deployed on Cloudflare, real data, storefront public, admin reachable.**
> Not the full 4-week build. What lands and what doesn't is stated at the bottom.

---

## The two shortcuts this plan is built on

**1. Drizzle, not Prisma — decided on measurement, 2026-08-10.**

Prisma 7 does run on Workers (Rust-free, first-class target). It was tried first and
rejected on **bundle size**:

| Scaffold, no features | gzipped | of the 3 MB free limit |
| --------------------- | ------- | ---------------------- |
| Next.js alone         | 0.94 MB | 31%                    |
| **+ Prisma client**   | 2.79 MB | **93%**                |
| **+ Drizzle**         | 1.02 MB | **34%**                |

Prisma's client alone costs **1.85 MB**. Drizzle's whole DB layer costs **~88 KB**.
Staying on Prisma meant paying Cloudflare $5/month for headroom Drizzle gives free.

**The schema converted itself.** Tavkil's 34 SQL migrations were applied to Neon
directly over TCP, then `drizzle-kit pull` introspected the result: **32 tables, 324
columns, 38 foreign keys, 51 indexes**, generated into `src/lib/db/schema.ts` (705
lines) and `relations.ts` (290 lines). One manual fix — `citext` isn't recognised by
introspection, so `src/lib/db/citext.ts` defines it.

**What this costs:** queries no longer port verbatim. Tavkil's 19 services are full of
Prisma calls that must be rewritten in Drizzle. Business logic survives; the data
access doesn't. See §Blocks 2–3 — this is now the main work of the project.

#### Use HTTP mode, not WebSocket — this is the Neon cost question

Neon free tier = **100 CU-hours/month**. What burns them is keeping the compute
_awake_. Persistent TCP/WebSocket connections hold it open; one-shot HTTP queries let
it autosuspend almost immediately.

| Mode                | Cost                | Transactions          |
| ------------------- | ------------------- | --------------------- |
| **HTTP** (use this) | autosuspends fast   | `db.batch()` only     |
| WebSocket Pool      | keeps compute awake | interactive supported |

**Transaction audit — 15 uses in the Nest backend:**

- `products`, `categories`, `rbac` → array form, non-interactive → becomes
  `db.batch([...])`, **HTTP-safe**. These are the ones being ported.
- `permissions-sync.service.ts` → callback form with `pg_advisory_xact_lock`, needs a
  real transaction. It's a boot-time sync job, not a request path — **run it as a
  script over `DIRECT_URL` (TCP), outside the Worker.**

Ref: [Neon connection methods](https://neon.com/docs/connect/choose-connection)

**2. Do not port the admin SPA to Next.js routes.**
It's a pure Vite SPA. Build it, serve the static output under `/admin`, point its API
base at same-origin. Zero component changes. The Next.js → admin migration is a
later job, and may never be worth doing.

What's left is the one real job: **Nest → Next route handlers.** The services are plain
Prisma calls; strip the Nest decorators and they're portable near-verbatim.

---

## Blocks

| #   | Block                            | Hrs | Output                                             |
| --- | -------------------------------- | --- | -------------------------------------------------- |
| 0   | **Prisma-on-Workers smoke test** | 0.5 | Confirm in practice. See below.                    |
| 1   | Scaffold + DB                    | 1.0 | Repo, Neon, schema migrated, seeded                |
| 2   | Services port                    | 1.5 | Catalog services as plain functions                |
| 3   | API + auth                       | 1.5 | Route handlers, Google admin auth                  |
| 4   | Storefront                       | 2.0 | 6 routes on real data, prices + suppliers stripped |
| 5   | Admin mount                      | 1.5 | SPA served at `/admin`, talking to the API         |
| 6   | Deploy                           | 1.0 | Live on Cloudflare, smoke-tested                   |
| 7   | Tests                            | 1.5 | Public-leak suite + 3 Playwright flows             |

**≈ 10.75 hours.** Long day. Block 7 is non-negotiable — see below.

---

### Block 0 — ✅ DONE (during setup, 2026-08-10)

Already proven. The scaffold builds through OpenNext and `wrangler deploy --dry-run`
succeeds with the real 32-model Prisma client imported via `src/app/api/health/route.ts`.

**Measured result:**

```
Total Upload: 10305.67 KiB  /  gzip: 2854.53 KiB   ← 2.79 MB
```

#### ⚠️ Cloudflare Workers Paid is required — not optional

**2.79 MB of the free plan's 3 MB limit, before a single feature exists.** That's
Next.js + the Prisma client for 32 models + one route handler. Adding the storefront,
the admin API, and next-intl will blow past 3 MB immediately.

**Upgrade to Workers Paid ($5/month, 10 MB limit) before block 1.** At 10 MB there's
comfortable headroom. This is a hard blocker, not a nice-to-have — discovering it at
hour 9 would end the day with nothing deployed.

Cheaper alternatives, if $5/month is genuinely unwanted:

- **Trim the Prisma schema** to the ~15 models actually used. Saves maybe 300–500 KB —
  buys time, doesn't solve it, and contradicts "don't trim the schema on day 1".
- **Deploy to a Node host** (Vercel/Fly) instead of Workers. No bundle limit, but you
  lose R2 bindings and Cron Triggers and the whole plan changes.

Recommendation: pay the $5.

**Also still true:** keep `pnpm exec wrangler deploy --dry-run` in the loop. Bundle size
is now a live budget with ~7 MB of headroom, and the Prisma client grows with the schema.

### Block 1 — Scaffold + DB (1.0h)

1. New repo `mini-tavkil`. Copy `tavkil/storefront` in as the app root.
2. Copy `tavkil/backend/prisma/` wholesale — schema + all migrations.
3. Vendor `@repo/tokens` (115 lines CSS) and `@repo/icons` (249 lines) as plain files.
   Drop `@repo/countries` unless the contact form needs it.
4. Add `@opennextjs/cloudflare`, `wrangler`, `@prisma/adapter-neon`.
5. Neon project → `prisma migrate deploy` → seed from tavkil's seed script.

Full 32-table schema, live, in an hour. **Do not hand-trim the schema today** — unused
tables cost nothing. Trimming is week-2 cleanup.

### Block 2 — Services port (1.5h)

Copy from `backend/src/modules/` → `lib/services/`: **products, categories, suppliers**.

Mechanical: delete `@Injectable()`, drop constructor DI, take `prisma` as an argument.
Business logic untouched. Skip orders/buyers/account-requests entirely — not porting
those, ever.

### Block 3 — API + auth (1.5h)

- Route handlers under `app/api/` for the endpoints storefront + admin actually call.
  Read paths first, then product/category writes. **Not all 20 controllers** — only
  what blocks 4 and 5 need.
- Better Auth + Google, allowlist guard on `/api/admin/*` and `/admin/*`.
- Port `@RequirePermission` as a plain function call inside each handler. Same
  permission strings, colon notation.

### Block 4 — Storefront (2.0h)

- Point `src/lib/api/server.ts` at same-origin instead of the Nest URL. If the shapes
  match, most pages just work.
- Delete routes: `login`, `cart`, `request`, `orders`, `account`.
  Delete component folders: `auth/`, `cart/`, `orders/`, `account/`, `notifications/`.
- Strip supplier from 6 files: home (`tv-showcase`), `product/[slug]`,
  `catalogue/[category]`, `about`, and delete `components/catalog/supplier-card.tsx`.
- **One `publicProduct()` function** in the query layer returning a shape with no
  `price` and no `supplier` field. Every public page goes through it. A leak becomes a
  type error.
- Cart CTA → "Request a quote" → contact form.

### Block 5 — Admin mount (1.5h)

1. `pnpm build` the Vite admin as-is.
2. Serve the output under `/admin` (Worker static assets, SPA fallback to `index.html`).
3. Point its API base at same-origin.
4. Remove **Buyers** and **Operations** from `nav-items.ts`, and the two
   buyer/order stat tiles from `/dashboard`.

Nav entries only. **Don't delete the buyer/order feature folders today** — dead code
ships fine and deleting it burns an hour for zero user-visible gain.

### Block 6 — Deploy (1.0h)

R2 bucket, env vars (`DATABASE_URL`, Google OAuth, `ADMIN_ALLOWLIST`),
`wrangler deploy`, smoke test: home → catalogue → product → contact →
`/admin` login → edit a product.

### Block 7 — Tests (1.5h) — **do not skip this one**

Everything else in the cut list can wait a week. This can't: the site is live on
`tavkil.com` from day 1, and a price or supplier leak on a public page is the one
failure that's expensive to undo.

Minimum viable coverage — see `TESTING.md` for the full strategy:

1. **Public-leak Vitest suite.** For every public query function and route handler,
   assert no `price` / `supplier` key exists anywhere in the returned object, nested
   included. This is the suite that justifies the whole day.
2. **Playwright flow 2** — no price or supplier text on any public page, asserted
   against rendered HTML.
3. **Playwright flow 1** — home → category → product renders, images load.
4. **Playwright flow 8** — admin sign-in → create product → publish → visible on
   storefront.

Port the Playwright harness from `~/Documents/temsan/e2e` — session-saving, admin and
public projects, and `@axe-core/playwright` are already wired there.

Chrome DevTools MCP is configured in `.mcp.json` for exploratory checking during the
day. It leaves nothing behind — it is not a substitute for blocks 7.1–7.4.

---

## End of day — what's true

**Live:** storefront on real Neon data, no prices or suppliers public, admin reachable
behind Google auth, product + category editing works, deployed on Cloudflare.

**Tested:** public-leak suite (Vitest) + 3 Playwright flows.

**Not done:** most admin write endpoints (suppliers, settings, users) · FX cron
trigger · image upload pipeline (seeded URLs only) · TR/AR copy (plumbing only) ·
JSON-LD + dynamic sitemap + IndexNow · publish gate · full test suite ·
dead-code removal.

**Keep `SITE_INDEXABLE=false` until the SEO work lands.** Shipping thin, price-less,
single-locale pages to Google on day 1 is worse than not shipping them — first
impressions set crawl budget.

That's roughly week 1 of 4, compressed — because the schema, the UI, and the service
logic already existed. The remaining three weeks are the rest of the admin API surface.

---

## Rules for the day

1. **Block 0 is a gate.** Don't start block 1 before it resolves.
2. **Delete nothing that isn't in the way.** Hiding nav is a minute; deleting features
   is an hour. Cleanup is week 2.
3. **One enforcement point for price + supplier.** In the query layer, not in components.
4. **If a block runs 30 min over, cut its scope, not the next block.** Deploying at
   hour 9 with 4 working pages beats hour 13 with 8 half-working ones.
5. **Commit per block.** Six commits, so any block can be reverted alone.
