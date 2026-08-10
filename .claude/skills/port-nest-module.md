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
- Delete constructor DI; import the shared `db` from `@/lib/db`
- Nest exceptions → a local `AppError` with the same `error-codes.md` code
- `this.logger` → `console` or the app logger

```ts
// before (Nest)
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}   // <- both go
  async findAll(query: ListQuery) { … }
}

// after
export async function findAll(query: ListQuery) { … }   // imports `db` directly
```

### 2. Rewrite the queries — this is the real work

**Tavkil's services are Prisma; this project is Drizzle. Query code does not port
verbatim.** Separate the two things in every method:

- **Business logic** — validation, branching, ordering rules, publish gates, derived
  values. This is the value in these files. Keep it exactly as it is; don't "improve" it
  while translating.
- **Data access** — every `prisma.x.findMany/create/update/delete`. Rewritten.

Rough map:

| Prisma                               | Drizzle                                            |
| ------------------------------------ | -------------------------------------------------- |
| `findMany({ where, orderBy, take })` | `db.select().from(t).where(…).orderBy(…).limit(…)` |
| `findUnique({ where: { id } })`      | `db.query.t.findFirst({ where: eq(t.id, id) })`    |
| `include: { … }`                     | `with: { … }` (needs `relations.ts`) or a join     |
| `create({ data })`                   | `db.insert(t).values(…).returning()`               |
| `update({ where, data })`            | `db.update(t).set(…).where(…).returning()`         |
| `_count`, `groupBy`                  | `count()`, `sql\`…\``, `.groupBy()`                |

Two traps:

- **Drizzle returns arrays.** `findUnique` → `const [row] = await …` or `findFirst`.
- **Column names are snake_case in the DB, camelCase in the schema.** The client is
  configured with `casing: 'snake_case'`; use the schema's property names, not raw SQL
  column names, unless you're inside `sql\`…\``.

### 3. Check transactions

Grep the service for `$transaction`.

- **Array form** `$transaction([...])` → becomes `db.batch([...])`, fine on Neon HTTP
- **Callback form** `$transaction(async (tx) => …)` → **not supported on request paths.**
  Either express it as `db.batch`, or move the work to a script using `DIRECT_URL`.

Known cases: `products`, `categories`, `rbac` are array form. `permissions-sync` is
callback form with a `pg_advisory_xact_lock` and belongs in `scripts/`.

### 4. Controller → route handler

`<name>.controller.ts` → `app/api/<path>/route.ts` (public) or
`app/api/admin/<path>/route.ts` (admin)

- One exported `GET` / `POST` / `PATCH` / `DELETE` per method
- `@RequirePermission('x:y')` → `await requirePermission(req, 'x:y')` as the first line.
  Same colon strings — don't rename permissions.
- DTO zod schemas port unchanged; parse the body/query at the top of the handler
- Route params come from the second argument, not decorators
- Return `Response.json(...)`; map `AppError` to status via a shared `toResponse()`

### 5. Public paths get the guard

If the handler is reachable without a session, it returns data from
`lib/queries/public-*.ts` only. See the `public-data-guard` skill. No exceptions.

### 6. Wire the admin SPA

The Vite admin already calls these paths. Keep the **URL shape identical** to Tavkil's
Nest routes so the SPA's query layer needs no changes. If a path must change, change it
in the SPA too — never leave them out of sync.

### 7. Test

- Vitest integration test for the happy path and one permission-denied path. One live
  DB — create only `e2e-` prefixed rows and clean up. See TESTING.md §1.
- If public: add it to the public-leak suite

## Order to port

1. `categories` — smallest, proves the pattern
2. `products` — biggest payoff, unblocks the storefront
3. `suppliers`
4. `media` (upload → R2; see the browser-resize approach)
5. `settings`, `currencies`
6. `rbac`, `permissions` (sync becomes a script)

## Checklist per module

- [ ] Service is plain functions; business logic unchanged, queries rewritten in Drizzle
- [ ] No interactive transaction on a request path — `db.batch` or a script
- [ ] Permission check is the first line of each admin handler
- [ ] Public handlers return only public shapes
- [ ] URL paths match what the admin SPA already calls
- [ ] Integration test: happy path + permission denied
- [ ] Bundle still under the Workers limit
