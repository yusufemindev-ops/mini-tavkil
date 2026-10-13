<!-- Title format: <type>: [TSC-XXX] <description> (e.g. feat: [TSC-70] add CI workflows) -->

## Summary

<!-- 1-3 concise bullets explaining what changed and why -->

-

## Ticket

- Closes [TSC-](https://linear.app/tavkil/issue/TSC-)

## Type of Change

- [ ] `feat`: New feature or capability
- [ ] `fix`: Bug fix
- [ ] `perf`: Performance optimization
- [ ] `refactor`: Code change that neither fixes a bug nor adds a feature
- [ ] `chore`: Tooling, dependencies, or configuration
- [ ] `docs`: Documentation updates

## Impacted Surfaces

- [ ] **Storefront** (Next.js SSR/ISR, public catalog, buyer quotes)
- [ ] **Admin Dashboard** (React 19 Vite SPA, operations, catalog)
- [ ] **API / Workers** (Cloudflare Workers, Hono endpoints, webhooks)
- [ ] **Database** (Drizzle schema, Neon migrations)

## Verification & Test Plan

<!-- List the tests and commands run to verify these changes -->

- [ ] `pnpm typecheck` & `pnpm admin:typecheck` passed
- [ ] `pnpm lint` & `pnpm admin:lint` passed
- [ ] `pnpm test` passed
- [ ] Verified across supported locales (`en`, `tr`, `ar`) and RTL layout (if UI changed)
- [ ] Tested locally on `pnpm dev` / `pnpm admin:dev`

## Production Hard Rules

- [ ] **Pricing Secrecy**: No wholesale or sensitive pricing data leaked to public storefront (`pnpm check:pricing-leak`)
- [ ] **Edge RAM Limits**: Memory usage within Cloudflare Workers 128 MB boundary (bounded queries, pagination)
- [ ] **Translation Parity**: All keys present across `messages/{en,tr,ar}.json` (`pnpm check:i18n`)
- [ ] **Hooks & Guards**: Passed all pre-commit, commit-msg, and pre-push hooks without `--no-verify`

## Screenshots / Evidence (UI changes)

<!-- Attach before/after screenshots or screen recordings if applicable -->

## Notes for Reviewers

<!-- Any non-obvious trade-offs, architecture decisions, or rollout considerations -->
