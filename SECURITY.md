# Security Policy

## Reporting a vulnerability

If you discover a security issue in Tavkil, **please do not open a public GitHub issue**. Instead:

1. **Email** `yusufemin.dev@gmail.com` with details
2. Include: affected component (storefront / admin / API), steps to reproduce, suggested severity (low / medium / high / critical)
3. Expect an acknowledgment within **48 hours**

We treat security reports as our highest priority. Verified critical issues get a same-day patch + post-mortem.

## What's in scope

- The Tavkil codebase (`src/`, `admin/`, `scripts/`, `drizzle/`)
- Production deployment surfaces (`tavkil.com`, `tavkil.com/admin`, `tavkil.com/api`)
- Authentication flows (Google OAuth, admin allowlist/invites, buyer provisioning, session cookies)
- Pricing-visibility violations (any way to view `base_price` or `tier_markup_percent` on non-admin surfaces, or view another buyer's price, or view any price/supplier as an anonymous visitor)
- Authorization bypass (accessing `/api/admin/*` endpoints without required `domain:action` permissions)
- Stored secrets in version control (`gitleaks` runs in CI, and local pre-commit guards block secret files)

## What's out of scope (please don't report)

- Spam / abuse via public forms mitigated by Cloudflare Turnstile
- Vulnerabilities in third-party services we use (Cloudflare, Neon, Resend, Google OAuth) — report to those vendors directly
- Self-XSS / clickjacking on `localhost`
- Reports against unsupported browsers (we support the latest 2 stable versions of Chrome / Safari / Firefox)

## Pricing & supplier visibility — special class of issue

Tavkil's biggest commercial vulnerability is price or supplier leakage across the 3-audience boundary. If you find ANY way to:

- See `base_price`, `tier_markup_percent`, or supplier identities from a public or buyer response
- View one buyer's personalized `unitPrice` while authenticated as another buyer
- See any prices or supplier identities as an anonymous visitor (including JSON-LD, sitemaps, `llms.txt`, `llms-full.txt`, or RSC payloads)

Treat this as **critical severity** and report immediately. CI enforces this via `pnpm check:pricing-leak` and Playwright E2E assertions, but creative edge cases may exist.

## Disclosure policy

- We publish a security advisory after the fix ships to production
- Reporters get credit in the advisory unless they request anonymity

## Supported versions

| Version       | Supported                |
| ------------- | ------------------------ |
| latest `main` | ✅                       |
| previous tag  | ✅ (security fixes only) |
| older tags    | ❌                       |
