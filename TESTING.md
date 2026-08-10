# TESTING.md — mini-tavkil

Three tools, three jobs. Don't blur them.

| Tool                    | Job                                          | When                   |
| ----------------------- | -------------------------------------------- | ---------------------- |
| **Vitest**              | Unit + component + route-handler integration | Every PR, in CI        |
| **Playwright**          | Critical user flows, deterministic, recorded | Every PR, in CI        |
| **Chrome DevTools MCP** | Exploratory — agent drives a real browser    | On demand, never in CI |

Tavkil's docs chose DevTools MCP over Playwright to avoid maintaining a suite. That
was right for Tavkil, which had no E2E at all. **mini-tavkil takes both**, because
Temsan proved a Playwright suite is cheap to keep when the flows are few — and because
this one ships to a live domain where a silent price leak is unacceptable.

---

## 1. Vitest

`vitest run` · `vitest` for watch.

### Unit — pure logic

FX conversion, slug generation, permission resolution, price computation (admin side),
locale fallback. No DB, no network. Fast, run constantly.

### Component — React Testing Library + jsdom

Forms (RHF + zod validation paths), the image dropzone's resize call, locale switcher,
admin tables. Mock the data layer; don't hit Neon.

### Integration — route handlers against the real DB

**There is one database. No test branch, no dev branch** — single-environment by
decision (see `CLAUDE.md` §8). That makes test hygiene a hard requirement, not a nicety:

- **Every test creates its own data and deletes it**, pass or fail. Use
  `afterEach`/`afterAll` cleanup, never a shared fixture that lingers.
- **Prefix every test entity** — slug, SKU, name — with `e2e-`. Nothing without that
  prefix may ever be written or deleted by a test.
- **Never `deleteMany({})`** with an empty or broad filter. Always scope to the `e2e-`
  prefix. A stray truncate wipes the live catalog.
- Read-only assertions against seeded catalog data are fine and preferred.
- Use `DIRECT_URL` — interactive transactions are allowed in tests, unlike request paths.

> This is the trade for a single-environment setup: faster to run, nothing to keep in
> sync, but a careless test can damage live data. If that ever bites, the fix is a Neon
> branch per run — cheap to add later.

### The tests that matter most

**Public leak tests.** For every public route handler and every public page's data
function, assert the returned object has no `price` and no `supplier` key — including
nested objects and arrays. This is the one suite that must never be skipped.

```ts
expect(deepKeys(result)).not.toContain('price');
expect(deepKeys(result)).not.toContain('supplier');
```

Pair it with the type-level guarantee in `lib/queries/public-product.ts`. Types catch
it at build; this catches it if someone widens the type.

---

## 2. Playwright

`pnpm e2e` · `pnpm e2e:report`

Port the harness from `~/Documents/temsan/e2e` — it already has session-saving, an
admin project, a public project, and `@axe-core/playwright` wired.

### Critical flows — v1

**Public (anonymous)**

1. Home → category → product detail renders, images load
2. **No price and no supplier text anywhere on any public page** — assert against
   rendered HTML, not the API
3. Contact form: Turnstile → submit → success state
4. Locale switch EN ⇄ TR ⇄ AR keeps you on the same product, RTL applies in AR
5. Unknown slug → 404, not a 500
6. `robots.txt`, `sitemap.xml`, `llms.txt` return 200 and valid content

**Admin (authenticated)**

7. Google sign-in → `/admin`; non-allowlisted email is rejected
8. Create product → publish → appears on storefront
9. Edit price → **still absent from public page**
10. Upload image → resized WebP lands in R2 → renders on storefront
11. Catalog manager role cannot reach Settings or Users

### Rules

- Flows, not pages. If it doesn't cross a boundary, it's a Vitest test.
- No test depends on another's leftover data. Seed and clean per spec.
- A flaky test gets fixed or deleted the same day. A muted suite is worse than none.
- **Flow 8 runs against the live database.** It must create an `e2e-` prefixed product
  and delete it in teardown, even on failure. Never assert against real catalog rows
  by editing them.

---

## 3. Chrome DevTools MCP

Configured in `.mcp.json`. The agent drives a real Chrome — navigate, click, read the
live DOM, console, and network.

Use it for:

- **Exploratory checks** — "click through the catalogue in AR and tell me what looks wrong"
- **Lighthouse audits** — Core Web Vitals + WCAG 2.1 AA on public pages
- **Debugging** a specific failure, live, with console and network visible

Do not use it for regression coverage. It leaves nothing behind; Playwright does.

---

## 4. Gates

| Gate                  | Runs                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| pre-commit (lefthook) | prettier, eslint, locale parity, gitleaks                                                                       |
| pre-push              | `tsc --noEmit`, Vitest unit + component                                                                         |
| PR CI                 | full Vitest incl. integration, Playwright, **public-leak suite**, `wrangler deploy --dry-run` bundle-size check |
| Pre-release           | Lighthouse via DevTools MCP on the top 10 pages, AR/TR spot-check, all 11 flows                                 |

**Bundle-size check is a real gate here**, not a nicety — Workers caps at 3 MB gzipped
and the scaffold already uses 1.02 MB.

---

## 5. Minimum before anything else

`PLAN.md` step 14 covers the non-negotiable subset — the public-leak Vitest suite plus
Playwright flows 1, 2, and 8. Those three are what make a live domain safe to iterate on.

Everything else in this file comes after. Add flows as features land; don't write the
other eight specs against a codebase that's still moving.
