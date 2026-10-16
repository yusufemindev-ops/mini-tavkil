# Changelog

All notable changes to the Tavkil B2B Wholesale Platform (`tavkil.com`) are documented in this file.

## [Unreleased]

### Added

- **B2B Intake & Admin Operations Polish (`TSC-78`):** Live pending count badges on the Admin sidebar for **Account requests** (pending account requests + pending profile edit requests) and **Orders inbox** (`submitted` RFQ orders), full 250-country localized selector (`en`/`tr`/`ar`) on storefront `/request` and `/account`, disposable burner email domain blocking on public account requests, duplicate-email guard when reopening rejected requests, and guest-only redirect on `/request`.
- **Custom RBAC Roles & Admin E2E (`TSC-77`):** Full custom role CRUD (`GET`/`POST`/`PATCH`/`DELETE /api/admin/roles`) with domain-grouped permission matrix and automatic `:view` dependency locking in `/admin/users/roles`, custom role assignment for active and invited team members, last-active-Owner protection, SonarJS security lint + dependency CVE audit (`pnpm scan`), and authenticated Admin Playwright E2E suite (`e2e/public/admin-flow.spec.ts`).
- **Buyer Profile Edit Approval Workflow & Buyer E2E (`TSC-76`):** Buyer profile edit requests (`profile_edit_requests` table, `GET`/`POST`/`DELETE /api/buyer/profile-edit-requests`, admin review/approve/reject/reopen/delete with current-vs-proposed field diff cards in `/admin/account-requests`), storefront `NotificationBell` popover, and authenticated Buyer Playwright E2E suite (`e2e/public/buyer-flow.spec.ts`).
- **Storefront Buyer Portal & Transactional Notifications (`TSC-75`):** Authenticated buyer storefront pages (`/[locale]/login`, `/[locale]/request`, `/[locale]/account`, `/[locale]/cart`, `/[locale]/orders`, `/[locale]/orders/[ref]`), personalized tier `unitPrice` calculation on product detail pages with variant SKU selection and multi-currency conversion, RFQ order request submission (`O-YYYY-NNNN`), proforma quote accept/reject with price-change transparency, and transactional email notifications.
- **Admin Buyers & Orders Management (`TSC-74`):** Admin Buyer Accounts CRUD (verify/unverify, suspend/reactivate, tier markup %, online/last-seen presence), Account Requests review queue, Orders Inbox & Order Detail proforma quote confirmation with per-line price overrides, and daily cron auto-expiry of stale confirmed quotes.
- **Admin Audit Log & Currencies (`TSC-73`):** Append-only `audit_log` viewer (`/admin/audit-log`) with resource/search filtering, and compact FX refresh run history panel in Settings → Currencies.
- **Hono Edge API on Cloudflare Workers (`TSC-72`):** Migrated backend API routes to Hono (`src/server/app.ts`) with OpenAPI documentation at `/api/docs`, `requireAdminPerm` middleware, and zero-leak 3-audience boundaries.
- **CI/CD & Quality Guards (`TSC-70`, `TSC-71`):** GitHub Actions workflows (`ci.yml`, `e2e.yml`, `branch-guard.yml`, `commit-format.yml`, `db-schema-check.yml`, `gitleaks.yml`, `pricing-leak-check.yml`, `worker-bundle-size.yml`) and Lefthook git hooks.
