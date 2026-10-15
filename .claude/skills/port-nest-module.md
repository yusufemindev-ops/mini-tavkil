---
name: port-nest-module
description: Guides porting backend modules from the legacy Nest.js + Prisma repository (~/Documents/tavkil/backend/src/modules/) to Hono / Next.js Route Handlers + Drizzle ORM on Cloudflare Workers. Use when porting or expanding backend services, schemas, or route handlers.
---

# Skill: port-nest-module

How to port backend modules from the legacy Nest.js + Prisma repository (`~/Documents/tavkil/backend/src/modules/<name>/`) into this codebase's Hono API on Cloudflare Workers (and transitional Next.js Route Handlers) + Drizzle ORM.

## Module Status

### Already Ported (Foundation)

- `categories` (public & admin CRUD, reorder, translations)
- `products` (public leak-proof queries, admin CRUD, variants/options, arrange/reorder)
- `suppliers` (admin CRUD)
- `media` (browser-side Canvas → WebP resize + Cloudflare R2 upload)
- `settings` & `currencies` (FX refresh via Cron Trigger + settings endpoints)
- `permissions` (base catalog + `pnpm sync:permissions` script)

### Target Modules to Port / Expand Next

1. **`rbac` & `users`** (`TSC-49` — custom roles CRUD, full permission catalog matrix with dependency locking, admin team member invite/suspend/reactivate)
2. **`audit-log`** (`TSC-26` — append-only DB trigger, before/after diff snapshots, actor/target resolution, `GET /api/admin/audit-log` + filters)
3. **`buyers` & `account-requests`** (`TSC-43` — Google-only buyer Better Auth flow, public `/request` intake with Turnstile + MX/disposable email checks, admin approval with `tier_markup_percent`, buyer presence)
4. **`profile-edit-requests`** (`TSC-48` — buyer profile edit request modal, admin diff review, approve/reject/reopen)
5. **`orders`** (`TSC-53` / `TSC-64` — buyer cart & order request submission `TVK-XXXXXX`, variant SKU pricing, admin orders inbox, per-line buyer price override, buyer accept/reject with price-change transparency)
6. **`notifications` & `email`** (in-app notifications + transactional emails via Worker `ctx.waitUntil()`)

---

## Porting Steps

### 1. Service & Schemas → plain modules

`<name>.service.ts` → `src/lib/services/<name>.ts`
`<name>.schemas.ts` → `src/lib/services/<name>-schemas.ts` (or `-schema.ts`)

- Remove `@Injectable()` and the class wrapper; export plain `async` functions.
- Remove constructor DI; import `db` directly from `@/lib/db` inside the service file.
- **Keep validation schema files (`*-schema.ts`, `*-schemas.ts`) 100% pure:** Never import `@/lib/db` (directly or transitively) inside schema or pure policy modules (`import-boundary.test.ts` enforces this so unit tests can import schemas without `DATABASE_URL`).
- Convert Nest HTTP exceptions (`NotFoundException`, `UnprocessableEntityException`, etc.) to `AppError` helpers from `@/lib/api/errors` (`notFound`, `invalid`, `conflict`, `unprocessable`, etc.).

### 2. Rewrite Prisma queries to Drizzle

Keep the **business logic** (validation rules, publish gates, status transitions, price math) intact, and rewrite the **data access** layer from Prisma to Drizzle:

| Prisma                               | Drizzle                                             |
| ------------------------------------ | --------------------------------------------------- |
| `findMany({ where, orderBy, take })` | `db.select().from(t).where(…).orderBy(…).limit(…)`  |
| `findUnique({ where: { id } })`      | `db.query.t.findFirst({ where: eq(t.id, id) })`     |
| `include: { … }`                     | `with: { … }` (via `relations.ts`) or explicit join |
| `create({ data })`                   | `db.insert(t).values(…).returning()`                |
| `update({ where, data })`            | `db.update(t).set(…).where(…).returning()`          |
| `_count`, `groupBy`                  | `count()`, `sql`, `.groupBy()`                      |

**Key Drizzle & Worker rules:**

- **Drizzle returns arrays** on `select`/`insert`/`update`: destructure `const [row] = await ...`.
- **128 MB Worker RAM limit:** Always bound list queries with `.limit()` and select only needed columns.
- **No interactive transactions on request paths:** Neon HTTP mode does not support `db.transaction(async (tx) => ...)`.
  - Express multi-statement writes as `await db.batch([q1, q2, ...])` (which executes atomically in a single HTTP round-trip) or single CTE SQL statements.
  - Reserve interactive TCP transactions for CLI scripts using `DIRECT_URL`.

### 3. Controller → Hono Route / Next.js Route Handler (`adminRoute`)

Target: Dedicated **Hono** API router on Cloudflare Workers. Transitional: Next.js Route Handler (`src/app/api/...`).

`<name>.controller.ts` → `src/app/api/<path>/route.ts` (public/buyer) or `src/app/api/admin/<path>/route.ts` (admin)

- Export `GET` / `POST` / `PATCH` / `DELETE` handlers.
- **For `/api/admin/*` routes, always use `adminRoute()` from `@/lib/api/handler`:**

  ```ts
  import { adminRoute } from '@/lib/api/handler';
  export const PATCH = adminRoute(
    'products:edit',
    updateProductSchema,
    async ({ params, body, admin }) => {
      return updateProduct(params.id, body, admin);
    },
  );
  ```

  `adminRoute` authenticates and checks the colon permission _before_ reading the request body, validates `body` with Zod (`422` on failure), wraps the return value in `{ data: result }` (which the Admin SPA's API client expects), and sets `Cache-Control: private, no-store`.

- Keep URL paths and response shapes identical to what the Admin Vite SPA (`admin/`) and Storefront expect.

### 4. Enforce the 3-Audience Pricing Guard

- Anonymous endpoints: return data exclusively through `src/lib/queries/public-*.ts` (zero prices, zero suppliers).
- Buyer endpoints: return only computed `unitPrice` (never `basePriceAmount` or `tierMarkupPercent`) and scope all buyer queries by the authenticated `buyerId`.
- Admin endpoints: gated by admin session + permission check.

### 5. Verify & Test

- Add Vitest unit tests for business logic and integration tests (`e2e-` prefixed fixtures with teardown cleanup) for route handlers.
- Add public/buyer endpoints to the pricing-leak test suite.
- Run `pnpm typecheck`, `pnpm admin:typecheck`, `pnpm lint`, `pnpm test`, and `pnpm check:pricing-leak`.
