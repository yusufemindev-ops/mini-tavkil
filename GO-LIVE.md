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

`placehold.co` is already out of the CSP — the seed carries real product
photography in R2, so `img-src` is self plus the R2 host and nothing else.

## 5. Turn on indexing — last, not first

```bash
# wrangler.jsonc vars
"SITE_INDEXABLE": "true"
```

Everything is `noindex` until this flips, and that is on purpose: an indexed
`workers.dev` URL is very hard to un-index and would compete with `tavkil.com` for
the same content. Lighthouse SEO scores **69** today for exactly this reason —
"Page is blocked from indexing" is its _only_ failing audit, so the score is 100
the moment this flips. Accessibility measures 96 and Best Practices 100.

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

## Settings you must fill in — the storefront hides what is unset

Every field below is empty in the database, and each one silently removes UI:
an unset value means "hide the corresponding element" everywhere, deliberately,
so nothing renders as a broken half-thing. The effect is a storefront that looks
like it is missing features when it is really missing data.

| Setting                       | Where                       | What is hidden while empty                                                   |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| **WhatsApp number**           | Settings → Contact & social | the floating WhatsApp button on every page, and the WhatsApp CTA on /contact |
| **Instagram/TikTok/Facebook** | Settings → Contact & social | the entire "Follow us" column in the footer                                  |
| **Google Maps embed**         | Settings → Contact & social | the map panel on /contact                                                    |
| **Logo**                      | Settings → Branding         | falls back to the "T" tile                                                   |
| **Default OG image**          | Settings → SEO defaults     | shared links get no preview image                                            |

`contactEmail`, `inquiryEmail` and `address` are set to `info@tavkil.com` /
İstanbul as sensible defaults — change them if either is wrong.

## Things I could not verify — please check these

| What                         | Why                                                                        | Where   |
| ---------------------------- | -------------------------------------------------------------------------- | ------- |
| **Upload → R2 → storefront** | needs a real file picked in a browser; the endpoint and R2 write are green | step 10 |
| **Rich Results Test**        | needs a crawlable URL, so it waits on `SITE_INDEXABLE`                     | §14g    |
| **Contact form submission**  | disabled until Turnstile keys exist — the button says so on the page       | §2      |

**Admin Playwright flows now run.** They needed a saved Google session, which is
why they had never executed once — and every bug the first real login found lived
in that gap. `e2e/.auth/admin.json` (gitignored) holds one; regenerate it when
the admin specs start redirecting to `/admin/login`.

## Accepted, on the record: the brand orange fails AA on button labels

Your call on 2026-08-11, and it should stay a visible decision rather than a
silent exception in a test file.

`--primary` is Tavkil's exact `#f2640c`. **White text on it measures 3.18:1**,
where WCAG 2.1 AA wants 4.5:1 for normal text. That affects primary button labels
and the active language pill — 3–5 elements per page. Everything else is clean:
orange used as _text_ goes through `--primary-ink` (`#bd4c06`, 5.00:1 on white and
≥4.5 on every tinted surface it sits on), and large
display text passes the 3:1 large-text bar at 3.18.

`e2e/public/a11y.spec.ts` allows exactly one pairing — white on `#f2640c` — so any
other contrast regression still fails the run. It is not a blanket suppression.

If you ever want it fully AA-clean without touching the brand, the move is dark
ink on the orange fill (`#15181d` on `#f2640c` ≈ 6.3:1), which is already what
dark mode does. It changes how buttons look; that's why I didn't do it.

## Worth doing, not blocking

**Secrets in the build artifact.** `.open-next/cloudflare/next-env.mjs` holds
`DATABASE_URL`, `BETTER_AUTH_SECRET` and `GOOGLE_CLIENT_SECRET` in plaintext.
Checked and **not** as bad as it looks: OpenNext assigns Worker bindings first and
only fills gaps with `??=`, and all five are real `wrangler secret`s — so the
inlined copies are never read, and rotation works normally. But a copied build
directory is a credential dump. Fix by building with an `.env` holding only the
three public `NEXT_PUBLIC_*` values.

**WAF rate limiting — now required, not optional.** The in-Worker limiter was
removed: it never returned a 429 and produced no diagnostic, so it was a control
that looked present in review while doing nothing. Add a Cloudflare rate-limit
rule instead:

- `/api/contact` — 5 requests / minute per IP
- `/api/auth/*` — 20 requests / minute per IP

Also enable the WAF managed rules while you are there.

**R2.** `tavkil-images` should be public-read but **not listable**; `tavkil-cache`
stays fully private.
