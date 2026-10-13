# Tavkil — System Architecture & Infrastructure Guide

This document captures the locked architecture, infrastructure specifications, and memory/database constraints for evolving Tavkil into a full-scale B2B wholesale platform.

---

## 1. System Overview

```
       [ CLIENT / FRONTEND LAYER ]
┌─────────────────────────┐     ┌─────────────────────────┐
│  B2B Customer Storefront│     │   Vendor/Admin Panel    │
│   Next.js (Dynamic SSR) │     │    React.js (SPA UI)    │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼  [ Standard HTTPS Requests ]
              ┌─────────────────────────────┐
              │   Cloudflare Pages Network  │ (Global UI Edge)
              └──────────────┬──────────────┘
                             │
                             ▼  [ JSON API / Cookies ]
              ┌─────────────────────────────┐
              │    Cloudflare Workers       │ (Edge API Orchestrator)
              │    • Backend API: Hono      │
              └──────────────┬──────────────┘
                             │
                             ▼  [ Fast ~1ms Proxy Connection ]
              ┌─────────────────────────────┐
              │ Cloudflare Hyperdrive Pool  │ (Globally Distributed Connection)
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Neon Serverless Postgres   │ (The Single Source of Truth)
              └─────────────────────────────┘
```

### Components

1. **B2B Customer Storefront (Next.js)**: Server-rendered for top-tier SEO/GEO/AEO, localized (EN, TR, AR), no public prices.
2. **Vendor / Admin Panel (React SPA)**: Fast, dynamic management dashboard for catalog, order inquiries, and permissions.
3. **Backend API (Hono on Cloudflare Workers)**: Lightweight, zero-cold-start API layer isolating business logic and database credentials.
4. **Cloudflare Hyperdrive**: Globally pools and accelerates database connections from edge workers down to ~1ms.
5. **Database (Neon Serverless Postgres + Drizzle ORM)**: Scalable relational database with instant branching, automated backups, and point-in-time recovery.
6. **Object Storage (Cloudflare R2)**: Zero-egress S3-compatible buckets for catalog images and ISR page cache.

---

## 2. Cloudflare Workers Paid Plan (Target Specs)

- **Base Cost:** $5/month (Standard usage model).
- **Included Monthly Allotment:** 10 million requests + 30 million CPU milliseconds (extra: $0.30/M requests, $0.02/M CPU ms).
- **CPU Time Limit:** Default 30 seconds per request (configurable up to 5 minutes in wrangler config).
- **Wall-Clock / Network Time:** Unlimited (as long as the client connection remains active and streaming).
- **Outbound Subrequests:** 10,000 per invocation (vs 50 on Free tier).
- **Memory Cap:** **128 MB per isolate** (strict hard limit across both Free and Paid tiers).

---

## 3. Memory & Neon Database Constraints (128 MB RAM Boundary)

### The 128 MB Hard Boundary

A Worker instance terminates with an unrecoverable **Out-Of-Memory (OOM)** error if RAM consumption exceeds 128 MB.

### Critical Rules for Data Access:

1. **Strict Pagination Everywhere**:
   - **NEVER** run unbounded queries like `SELECT * FROM products`.
   - Every catalog or admin listing query must enforce `LIMIT` (e.g. 20–50 items) and cursor/offset pagination.
2. **Lean Projections**:
   - Select only the necessary columns for lists. Do not load large text, HTML, or JSON blobs unless rendering a single product detail page.
3. **Streaming for Large Payloads**:
   - When generating large CSVs or exporting catalogs, stream results via Web Streams rather than buffering arrays in worker memory.
4. **Connection Optimization**:
   - Use Cloudflare Hyperdrive with Drizzle to pool database connections and avoid edge TLS handshake overhead.

---

## 4. Asynchronous Tasks & Media Processing

1. **Background Tasks (Emails, SMS, Notifications)**:
   - Use `ctx.waitUntil()` for fire-and-forget notifications (Resend/Postmark emails, Twilio SMS, WhatsApp alerts).
   - Use Cloudflare Cron Triggers for scheduled periodic jobs (FX currency rate syncing).
2. **Image Processing**:
   - Cloudflare Workers cannot run native C/C++ libraries like `sharp`.
   - All image resizing happens in the admin browser using the Canvas WebP pipeline (`lib/image-resize.ts`, max 1600px) before uploading directly to Cloudflare R2.

---

## 5. Branching & Environments

- **Git Branches**:
  - `main`: Clean, stable production releases.
  - `develop`: Active feature development, testing, and staging.
- **Neon Database**:
  - `main` branch: Production database.
  - `dev` branch: Cloned instantly in Neon dashboard for zero-risk schema migration testing.
- **R2 Storage**:
  - Uses `preview_bucket_name` in `wrangler.jsonc` to isolate dev uploads from production assets.
