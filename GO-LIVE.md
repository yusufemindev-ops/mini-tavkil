# Go live — what's left, and what it costs

Steps 1–14 are done and deployed. Everything below needs credentials or a browser
session I don't have. Live now: <https://mini-tavkil.yusufemin-dev.workers.dev>

---

## 1. Attach the domain

```bash
# Cloudflare dashboard → Workers → mini-tavkil → Settings → Domains & Routes
# Add custom domain: tavkil.com  (and www.tavkil.com if you want it)
```

Then update, in this order:

```bash
# .env and .env.production
NEXT_PUBLIC_SITE_URL=https://tavkil.com

wrangler secret put BETTER_AUTH_URL     # https://tavkil.com
```

**Google OAuth** — add the new redirect URI _before_ deploying, or admin sign-in
breaks the moment the domain goes live:

```
https://tavkil.com/api/auth/callback/google
```

## 2. Turnstile — the contact form is disabled without it

Cloudflare dashboard → Turnstile → Add site → `tavkil.com`.

```bash
# .env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
wrangler secret put TURNSTILE_SECRET_KEY
```

Until these exist the form renders disabled and points at the email/WhatsApp
links. That is deliberate: the endpoint **refuses every submission** when the
secret is missing, because treating "not configured" as "skip the captcha" would
turn one unset variable into an open relay into your inbox.

## 3. Email — the form can't deliver without it

Cloudflare Email Routing must be enabled on the zone with a **verified
destination address** first. Then add the binding:

```jsonc
// wrangler.jsonc
"send_email": [{ "name": "CONTACT_EMAIL", "destination_address": "sales@tavkil.com" }],
```

It is deliberately not there yet — adding it before the zone exists fails the
deploy. Set the destination in the admin too: **Settings → General → inquiry
email**.

## 4. Images

```bash
# .env — r2.dev is rate-limited and not for production traffic
NEXT_PUBLIC_R2_PUBLIC_URL=https://images.tavkil.com
```

Attach `images.tavkil.com` to the `tavkil-images` bucket (R2 → Settings → Public
access → Custom domain).

**No data migration is needed.** Uploads store a bare R2 key and
`resolveImageUrl()` resolves it at read time — that was the whole reason for
storing keys rather than URLs.

Then remove `https://placehold.co` from the CSP in `next.config.ts`. It is only
there for the seeded rows; the admin dashboard's **"missing primary image"** count
tells you when every product has a real one.

## 5. Turn on indexing — last, not first

```bash
# wrangler.jsonc vars
"SITE_INDEXABLE": "true"
```

Everything is `noindex` until this flips, and that is on purpose: an indexed
`workers.dev` URL is very hard to un-index and would compete with `tavkil.com` for
the same content. Lighthouse SEO scores 66 today for exactly this reason — with
indexing on it measures **100**.

## 6. Deploy, then re-verify against the real domain

```bash
pnpm run deploy
E2E_BASE_URL=https://tavkil.com pnpm e2e --project=public
```

Scores measured on `workers.dev` don't carry over — the domain, caching and CSP
all change.

```bash
pnpm add -D @lhci/cli
pnpm exec lhci autorun --collect.url=https://tavkil.com/en \
  --collect.url=https://tavkil.com/en/catalogue \
  --collect.url=https://tavkil.com/en/product/<slug>
```

Budgets are in `.lighthouserc.json` and fail the run rather than being noted.

## 7. Submit and confirm

- Google Search Console → add property → submit `https://tavkil.com/sitemap.xml`
- Bing Webmaster Tools → same
- **Rich Results Test** on a product URL: `Product` must validate **without**
  `offers`, and `BreadcrumbList` must parse. This can only run once the URL is
  crawlable, which is why it wasn't done already.
- Publish a product and confirm the IndexNow POST returned 200/202

---

## Things I could not verify — please check these

| What                         | Why                                                                                                                                                                                                                                                                                  | Where    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Upload → R2 → storefront** | needs a Google sign-in                                                                                                                                                                                                                                                               | step 10  |
| **Admin Playwright flows**   | needs a saved session; see `e2e/admin.setup.ts`                                                                                                                                                                                                                                      | step 14b |
| **In-Worker rate limit**     | never returned a 429 across 12 rapid requests, and `wrangler tail` caught no diagnostic. It may be that OpenNext doesn't surface ratelimit bindings. **Do not assume it works.** Either confirm it or delete it and rely on a WAF rate-limit rule on `/api/contact` and `/api/auth`. | step 13  |
| **Rich Results Test**        | needs a crawlable URL                                                                                                                                                                                                                                                                | §14g     |

## Worth doing, not blocking

**Secrets in the build artifact.** `.open-next/cloudflare/next-env.mjs` holds
`DATABASE_URL`, `BETTER_AUTH_SECRET` and `GOOGLE_CLIENT_SECRET` in plaintext.
Checked and **not** as bad as it looks: OpenNext assigns Worker bindings first and
only fills gaps with `??=`, and all five are real `wrangler secret`s — so the
inlined copies are never read, and rotation works normally. But a copied build
directory is a credential dump. Fix by building with an `.env` holding only the
three public `NEXT_PUBLIC_*` values.

**WAF.** Enable managed rules, and add a rate-limit rule on `/api/contact` and
`/api/auth`.

**R2.** `tavkil-images` should be public-read but **not listable**; `tavkil-cache`
stays fully private.
