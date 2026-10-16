# Contributing

## TL;DR

1. Sync `develop`: `git checkout develop && git pull --ff-only origin develop`
2. Create feature branch: `git checkout -b feat/TSC-XXX-short-description` (branch format enforced)
3. Make changes — pre-commit hooks run whitespace checks, secret guards, locale parity, Prettier, and ESLint
4. Commit: `git commit -m "feat: [TSC-XXX] short description"` (single-line, <= 72 chars, format enforced)
5. Push & open PR targeting `develop` — pre-push hooks run `typecheck`, `admin:typecheck`, and Vitest unit tests; CI runs the full quality gate, security scanner, and Playwright E2E suite

## Hard rules

- Never use `--no-verify` to skip git hooks. Fix the underlying issue.
- Never expose `base_price` or `tier_markup_percent` to public or buyer surfaces, or expose any price/supplier to anonymous visitors.
- Never use TanStack Query on a public indexable storefront page — public pages must use Next.js Server Components.
- Never use interactive `db.transaction()` on a Cloudflare Worker request path — use `db.batch([...])` over Neon HTTP.
- Always bound database queries with `.limit()` to respect the 128 MB Cloudflare Worker isolate limit.
- Always use `domain:action` (colons) for permissions, never dots (`orders:confirm`, `products:edit`).
- Always use `pnpm`, never `npm` or `yarn`.

## Reading order before your first PR

1. [`CLAUDE.md`](./CLAUDE.md) & [`AGENTS.md`](./AGENTS.md) — project rules and architecture invariants
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Cloudflare Workers, Hono API, Neon HTTP, R2, and 128 MB RAM constraints
3. [`TESTING.md`](./TESTING.md) — Vitest, Playwright E2E, and pricing leak guards

## Verification commands

```bash
pnpm lint
pnpm admin:lint
pnpm format:check
pnpm typecheck
pnpm admin:typecheck
pnpm check:i18n
pnpm check:pricing-leak
pnpm test
pnpm scan
```
