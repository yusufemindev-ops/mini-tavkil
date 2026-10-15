---
name: hono
description: Build and test Hono API routes in mini-tavkil (src/server/). Use when adding or modifying backend API endpoints, Hono middleware, request validation, or testing API routes with Hono CLI and app.request().
---

# Skill: Hono Backend API (mini-tavkil)

Official [Hono Agent Skill](https://github.com/honojs/skills) adapted for Tavkil's Cloudflare Workers + Neon Serverless Postgres + Drizzle ORM architecture.

## Latest Hono Documentation

Fetch any page from `https://hono.dev` as Markdown using the `Accept: text/markdown` header (index at `https://hono.dev/llms.txt`):

```bash
curl -H "Accept: text/markdown" https://hono.dev/docs/api/routing
```

## Hono CLI (`@hono/cli`)

Inspect and test `src/server/app.ts` in-process without starting a dev server. Every command outputs JSON:

```bash
# List all registered API routes without reading source files
pnpm exec hono routes src/server/app.ts

# Send a single request through app.request()
pnpm exec hono request /api/health src/server/app.ts

# Run a multi-step batch assertion
pnpm exec hono batch - src/server/app.ts <<'EOF'
{"path":"/api/health","expect":{"status":200,"body":{"ok":true}}}
EOF
```

---

## Tavkil Hono Architecture (`src/server/`)

- **`src/server/app.ts`**: Root Hono application (`new Hono<AppEnv>().basePath('/api')`). Exports `app` and `default` (for Hono CLI, Vitest `app.request()`, and Worker routing).
- **`src/server/factory.ts`**: Shared `AppEnv` (`Bindings` + `Variables: { admin: AdminUser }`), `factory = createFactory<AppEnv>()`, `requireAdminPerm(permission)`, `parseJson(schema)`, and `adminJson(c, data, status)` envelope helpers.
- **`src/server/routes/`**: Modular feature routers mounted onto `src/server/app.ts` via `app.route()`:
  - `health.ts` → `/api/health`
  - `auth.ts` → `/api/auth/*` (Better Auth handler)
  - `admin/*.ts` → `/api/admin/*` (`me`, `dashboard`, `categories`, `products`, `suppliers`, `currencies`, `settings`, `users`, `media`)
  - `docs.ts` → `/api/docs` (interactive Hono API Explorer UI) & `/api/openapi.json` (OpenAPI 3.1 spec)
- **`src/app/api/[[...route]]/route.ts`**: Next.js catch-all bridge (`handle(app)` from `hono/vercel`) so `next dev`, `next start`, and OpenNext (`revalidatePath` D1 tag cache + R2 bindings) execute the exact same Hono app.

---

## Core Conventions for `/api/admin/*` Routes

1. **Permission First (`domain:action`):**
   Always authenticate and check the colon-delimited permission (`products:edit`, `categories:publish`, `users:assign_role`) **before** parsing the request body using `requireAdminPerm('domain:action')`.
2. **Zod Body Validation (`422`):**
   Use `parseJson(schema)` from `src/server/factory.ts` (or `schema.parse()`). Malformed JSON returns `422` (`validation.failed: Request body must be valid JSON.`) and schema errors return `422` with per-field `details`.
3. **Response Envelope (`{ data }` + `no-store`):**
   All `/api/admin/*` responses must use `adminJson(c, result)` which wraps payloads in `{ data: result }` and sets `Cache-Control: private, no-store`.
4. **Error Handling (`toErrorResponse`):**
   Throw `AppError` helpers from `@/lib/api/errors` (`notFound`, `conflict`, `invalid`, `AuthError`). `app.onError` in `src/server/app.ts` maps all thrown errors to `{ error: { code, message, details? } }` and hides raw database errors behind a generic `500`.
5. **3-Audience Pricing & Supplier Guard:**
   - **Public:** Zero prices (`base_price`, `tier_markup_percent`, `unit_price`) and zero supplier identities.
   - **Buyer:** Only computed `unitPrice`; never expose `base_price` or `tier_markup_percent`.
   - **Admin:** Full visibility, strictly behind `requireAdminPerm(...)`.
6. **Cloudflare Workers + Neon HTTP Constraints:**
   - Never use interactive `db.transaction()` on request paths; use `await db.batch([...])`.
   - Always bound `SELECT` queries with `.limit()` for the 128 MB Worker RAM limit.

---

## Writing a Hono Admin Route

```ts
import { Hono } from 'hono';
import { type AppEnv, adminJson, parseJson, requireAdminPerm } from '@/server/factory';
import { createCategorySchema, updateCategorySchema } from '@/lib/services/catalog-schemas';
import { createCategory, listCategories, updateCategory } from '@/lib/services/categories';

export const adminCategoriesApp = new Hono<AppEnv>()
  .get('/', requireAdminPerm('categories:view'), async (c) => {
    return adminJson(c, await listCategories());
  })
  .post('/', requireAdminPerm('categories:create'), async (c) => {
    const body = await parseJson(c, createCategorySchema);
    return adminJson(c, await createCategory(body));
  })
  .patch('/:id', requireAdminPerm('categories:edit'), async (c) => {
    const body = await parseJson(c, updateCategorySchema);
    return adminJson(c, await updateCategory(c.req.param('id'), body));
  });
```

## Testing with `app.request()` in Vitest

```ts
import { app } from '@/server/app';

const res = await app.request('/api/health');
expect(res.status).toBe(200);
expect(await res.json()).toEqual({
  ok: true,
  categories: expect.any(Number),
  products: expect.any(Number),
});
```
