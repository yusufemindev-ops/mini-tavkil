# Skill: port-nest-module

The most-repeated task in this project. Tavkil has **20 controllers and 19 services**;
they become Next.js route handlers and plain functions. Do it the same way every time.

Source: `~/Documents/tavkil/backend/src/modules/<name>/`

## Do not port

`orders`, `buyers`, `account-requests`, `profile-edit-requests`, `audit-log`.
Those features are cut — see `PLAN.md` §3.

## Steps

### 1. Service → plain function module

`<name>.service.ts` → `lib/services/<name>.ts`

- Delete `@Injectable()` and the class wrapper
- Delete constructor DI; take `prisma` as the first argument, or import the shared client
- Keep every method body **as-is**. Business logic is the value here; don't "improve" it.
- Nest exceptions → a local `AppError` with the same `error-codes.md` code
- `this.logger` → `console` or the app logger

```ts
// before (Nest)
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(query: ListQuery) { … }
}

// after
export async function findAll(prisma: PrismaClient, query: ListQuery) { … }
```

### 2. Check transactions

Grep the service for `$transaction`.

- **Array form** `$transaction([...])` → fine on Neon HTTP, leave it
- **Callback form** `$transaction(async (tx) => …)` → **not supported on request paths.**
  Either rewrite as array form, or move the work to a script using `DIRECT_URL`.

Known cases: `products`, `categories`, `rbac` are array form. `permissions-sync` is
callback form with an advisory lock and belongs in `scripts/`.

### 3. Controller → route handler

`<name>.controller.ts` → `app/api/<path>/route.ts` (public) or
`app/api/admin/<path>/route.ts` (admin)

- One exported `GET` / `POST` / `PATCH` / `DELETE` per method
- `@RequirePermission('x:y')` → `await requirePermission(req, 'x:y')` as the first line.
  Same colon strings — don't rename permissions.
- DTO zod schemas port unchanged; parse the body/query at the top of the handler
- Route params come from the second argument, not decorators
- Return `Response.json(...)`; map `AppError` to status via a shared `toResponse()`

### 4. Public paths get the guard

If the handler is reachable without a session, it returns data from
`lib/queries/public-*.ts` only. See the `public-data-guard` skill. No exceptions.

### 5. Wire the admin SPA

The Vite admin already calls these paths. Keep the **URL shape identical** to Tavkil's
Nest routes so the SPA's query layer needs no changes. If a path must change, change it
in the SPA too — never leave them out of sync.

### 6. Test

- Vitest integration test against a Neon branch for at least the happy path and one
  permission-denied path
- If public: add it to the public-leak suite

## Order to port

1. `categories` — smallest, proves the pattern
2. `products` — biggest payoff, unblocks the storefront
3. `suppliers`
4. `media` (upload → R2; see the browser-resize approach)
5. `settings`, `currencies`
6. `rbac`, `permissions` (sync becomes a script)

## Checklist per module

- [ ] Service is plain functions, logic unchanged
- [ ] No callback-form `$transaction` on a request path
- [ ] Permission check is the first line of each admin handler
- [ ] Public handlers return only public shapes
- [ ] URL paths match what the admin SPA already calls
- [ ] Integration test: happy path + permission denied
- [ ] Bundle still under the Workers limit
