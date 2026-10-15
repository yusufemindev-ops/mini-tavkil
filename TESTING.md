# TESTING.md — Tavkil (`mini-tavkil`)

Three tools, three jobs. Don't blur them.

| Tool                    | Job                                          | When                   |
| ----------------------- | -------------------------------------------- | ---------------------- |
| **Vitest**              | Unit + component + route-handler integration | Every PR, in CI        |
| **Playwright**          | Critical user flows, deterministic, recorded | Every PR, in CI        |
| **Chrome DevTools MCP** | Exploratory — agent drives a real browser    | On demand, never in CI |

---

## 1. Vitest

`pnpm test` (unit + component) · `pnpm test:integration` (DB integration) · `pnpm test:watch`

### Unit — pure logic

FX conversion, slug generation, permission resolution, publish-gate validation, price computation (`unitPrice` derivation), locale fallback. No DB, no network. Fast, run constantly.

### Component — React Testing Library + jsdom

Forms (RHF + zod validation paths), image dropzone resize call, locale switcher, admin tables. Mock the data layer; don't hit Neon.

### Integration — route handlers & queries against Neon (`dev` branch)

Local and CI tests run against the isolated Neon **`dev` branch** (never `main` production), but strict test hygiene is still a hard requirement so shared dev/seeded data stays clean:

- **Every test creates its own data and deletes it**, pass or fail. Use `afterEach`/`afterAll` cleanup, never a shared fixture that lingers.
- **Prefix every test entity** — slug, SKU, name, email — with `e2e-`. Nothing without that prefix may ever be written or deleted by a test.
- **Never `deleteMany({})`** with an empty or broad filter. Always scope deletes to the `e2e-` prefix.
- Read-only assertions against seeded catalog data are fine and preferred.
- Use `DIRECT_URL` when test setup/teardown needs TCP features.

### The tests that matter most: Pricing & Supplier Leak Guards

1. **Anonymous public leak tests:** For every public route handler and every public page's data function, assert the returned object has no `price` (`basePriceAmount`, `tierMarkupPercent`, `unitPrice`) and no `supplier` key — including nested objects and arrays.
2. **Buyer leak tests:** For authenticated buyer endpoints, assert that only the computed `unitPrice` is returned and raw `basePriceAmount` / `tierMarkupPercent` never appear anywhere in the payload.

```ts
expect(deepKeys(result)).not.toContain('basePriceAmount');
expect(deepKeys(result)).not.toContain('tierMarkupPercent');
```

Pair this with the compile-time guarantee in `src/lib/queries/public-product.ts` and `pnpm check:pricing-leak`.

---

## 2. Playwright

`pnpm e2e` · `pnpm e2e:report`

### Critical flows

#### Public (anonymous)

1. Home → category → product detail renders, images load
2. **No price and no supplier text anywhere on any public page** — assert against rendered HTML, not just the API
3. Public intake / contact flows validate and submit cleanly
4. Locale switch EN ⇄ TR ⇄ AR keeps you on the same product, RTL applies in AR
5. Unknown slug → 404, not a 500
6. `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` return 200 and valid content

#### Admin (authenticated)

1. Google sign-in → Admin dashboard; unprovisioned email is rejected
2. Create product → publish gate validation → publish → appears on storefront
3. Edit `base_price` → **still absent from anonymous public page**
4. Upload image → resized WebP lands in R2 → renders on storefront
5. Role permissions gate restricted admin routes (e.g. `catalog_manager` cannot access Users/Roles or Settings)

#### Buyer (authenticated — as buyer flows land)

1. Provisioned buyer signs in → views personalized `unitPrice` (with zero `base_price` or `tier_markup_percent` in HTML/network) → submits order request

### Rules

- Flows, not isolated unit checks. If it doesn't cross a boundary, it belongs in Vitest.
- No test depends on another's leftover data. Seed `e2e-` prefixed entities and clean up in teardown, even on failure. Never mutate real catalog rows.
- A flaky test gets fixed immediately.

---

## 3. Chrome DevTools MCP

Configured in `.mcp.json`. The agent drives a real Chrome instance — navigate, click, inspect live DOM, console, and network.

Use it for:

- **Exploratory checks** — verifying RTL layout in `ar` and responsive breakpoints (`375px` mobile, `1280px` desktop)
- **Lighthouse audits** — Core Web Vitals + WCAG 2.1 AA on public pages
- **Debugging** a specific UI or network failure live

Do not use it as a substitute for automated regression tests in Vitest or Playwright.

---

## 4. Quality Gates

| Gate                    | Runs                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `pre-commit` (lefthook) | Whitespace trim, secret file guard, locale parity (`check:i18n`), Prettier (`--check`), ESLint          |
| `commit-msg` (lefthook) | Conventional commit format with ticket (`<type>: [TSC-XXX] <description>`, max 72 chars)                |
| `pre-push` (lefthook)   | Protected branch guard, branch name guard, `typecheck`, `admin:typecheck`, Vitest unit + component      |
| PR CI (GitHub Actions)  | Lint, typecheck, locale parity, pricing leak check, Vitest unit + integration, Playwright E2E, CF build |
