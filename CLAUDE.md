# CLAUDE.md

Instructions and history for anyone (human or AI) continuing this project.
Read this first, then [PLAN.md](PLAN.md) (design) and [README.md](README.md) (how to run and observe it).

## What this project is

A learning project: an e-commerce site built to understand **Next.js ISR at scale**.
50,000 products, 200 shop owners editing all day, several app containers, a CDN in front.
The point is to see every caching layer working, so observability (logs, headers, GUI tools)
matters as much as features.

The owner prefers **simple, step-by-step explanations** with diagrams and tables, and wants
claims verified by running things, not assumed.

## Architecture

```
Browser → Varnish :8088 (local CDN) → nginx :8080 (load balancer) → web1 / web2 / web3 (Next.js 16)
                                                                       → Redis :6379 (shared ISR cache)
                                                                       → Postgres :5433 (50,000 products)
GUI tools: Dozzle :9999 (logs), Redis Insight :5540 (cache contents)
```

| Cache | Holds | Invalidated by |
|-------|-------|----------------|
| Varnish (CDN) | Finished pages (HTML and RSC payload, separately) | PURGE by `xkey` tag; TTL from `s-maxage` |
| Redis (ISR cache, via `web/cache-handler.js`) | Pages + `unstable_cache` query results | `updateTag` / `revalidateTag`; `revalidate` timer |
| Postgres | Source of truth | — |

Tags: `product-<id>` on product pages; `listing` and `listing-page-<n>` on listing pages
(listings sorted by id, 24 per page). Defined once in `web/src/lib/tags.ts`.

## Commands

```bash
# Build the app on the host, then (re)start everything
cd web && npm run build:docker && cd .. && docker compose up -d --build

# Lint and types (run before every rebuild)
cd web && npx eslint src cache-handler.js scripts && npx tsc --noEmit

# Observe (Git Bash, from the repo root)
bash tools/watch.sh                                        # live HIT / MISS / build / edit feed
bash tools/check.sh http://localhost:8088 /products/777    # headers at each layer
bash tools/edit.sh  http://localhost:8088 777 29.99        # edit like a browser (sends Origin)
bash tools/burst.sh /products/12345 300                    # concurrency test through the CDN

# Reset caches
docker compose exec redis redis-cli flushall && docker compose restart cdn
```

The database seed runs only when the `pgdata` volume is empty (`docker compose down -v` resets it).

## Rules for working on this code

- **Next.js 16.3 has breaking changes.** Before writing Next.js code, read the relevant guide in
  `web/node_modules/next/dist/docs/` (see `web/AGENTS.md`). Don't rely on memory of older versions.
- **Classic ISR, not Cache Components.** Pages use `revalidate`, `dynamicParams`,
  `generateStaticParams` and `unstable_cache` with tags. `cacheComponents` / `'use cache'` is a
  planned separate phase; don't mix the two models.
- **Invalidation API:** in Server Actions use `updateTag(tag)` (owner sees their change at once).
  Outside actions (route handlers, a worker) use `revalidateTag(tag, { expire: 0 })`.
  Never the deprecated one-argument `revalidateTag(tag)`.
- **Tag names only from `src/lib/tags.ts`.** The cached queries, the edit action, `proxy.ts`
  (CDN `xkey` header) and the CDN purge must agree.
- **Purge the CDN after Next.js has expired the tags** (the action uses `after()`), otherwise a
  request in between can put the old page back into the CDN.
- **Never put per-user data in ISR pages.** Reading `cookies()`/`headers()` makes a page dynamic.
  Admin pages are `force-dynamic` and bypassed by Varnish.
- **Verify behaviour by running it** (tools/ scripts, logs, headers), and report measured numbers.
- Match the existing style: short comments that explain *why*, readable log prefixes
  (`[cache]`, `[build]`, `[edit]`, `[cdn]`).
- **UI:** Tailwind v4 (theme tokens in `src/app/globals.css`, brand colour `brand-*`), system
  fonts only (no `next/font/google`: builds must not need the internet). Shared components in
  `src/components/`. Anything that must change per visitor or over time (e.g. "rendered 2 min
  ago") is a small client component, so cached HTML stays identical for everyone.
- `tools/check.sh` reads `data-price`, `data-rendered-at` and `data-rendered-by` attributes from
  the pages; keep them when changing markup.
- After `next build`, confirm product and listing routes still show `●` (ISR) and the home page
  `○`. A route turning `ƒ` (dynamic) means caching broke.

## Gotchas found while building (don't rediscover these)

1. **No `npm install` inside Docker on this machine.** HTTPS from containers to the npm registry
   fails certificate checks (antivirus/proxy). The image copies a standalone build made on the
   host by `npm run build:docker` (`web/scripts/build-docker.mjs`). Don't disable TLS checks.
2. **Windows build output needs two fixes**, done by that script:
   the cache handler path is stored as `..\\cache-handler.js` (Linux can't load it), and
   Turbopack's hashed package links (`.next/node_modules/pg-<hash>`) point at `C:\` paths,
   so they are replaced with real copies.
3. **The Redis cache handler must share two pieces of per-process state**, or containers disagree:
   - tag timestamps (`tagsManifest`): synced from Redis on every `get()`;
   - page lifetimes (`SharedCacheControls`): stored with each entry and restored on `get()`.
     Without this, other containers treat a 300 s page as 1 s old and serve it `STALE`.
4. **ioredis must queue commands until connected** (`enableOfflineQueue: true`) with a
   `commandTimeout`, or every container's first lookups after startup count as misses.
5. **Proxies must forward the host with its port.** nginx uses `$http_host`, not `$host`.
   Otherwise Next.js rejects Server Actions ("Invalid Server Actions request": Origin
   `localhost:8088` vs Host `localhost`). Test scripts must send an `Origin` header like browsers.
6. **Next.js doesn't expose its cache tags** in responses (no `x-next-cache-tags`), so
   `src/proxy.ts` adds an `xkey` header from the URL.
7. **RSC requests:** client navigation fetches `URL?_rsc=<hash>` with `RSC: 1`. Varnish caches
   that as a separate object (both purged together by tag). An RSC request without `_rsc` gets a
   307 and is passed, or Varnish would mark the HTML URL uncacheable for 2 minutes.
8. **Ports taken on this machine:** 5432 (local Postgres) → Docker Postgres on 5433;
   8000 (another container) → CDN on 8088.
9. `PREBUILD=0` during `build:docker` (no database at build time) → no pages pre-built in the image.
   Pre-built pages would sit on disk anyway; with a custom cache handler they'd need seeding into
   Redis. The planned warming job covers this.
10. `next start` prints a warning because of `output: "standalone"`; it still works locally.

## Measured results (for reference)

- `next build` with a database: 1,005 pages in 16.7 s → all 50,000 would take ~14 min.
- 300 concurrent requests to an unbuilt page: **3 builds** without the CDN (one per container),
  **1 request reaching the app / 1 build** through Varnish (1 miss, 299 hits).
- CDN hit ~0.1 ms; app render of a product page ~30–100 ms (first after start ~1 s).

## Status

| # | Phase | Status |
|---|-------|--------|
| 1 | Docker: Postgres + Redis, schema, 50,000-product seed | ✅ |
| 2 | Product, listing and admin pages with tags | ✅ |
| 3 | Redis cache handler (shared cache + shared tag state) | ✅ |
| 4 | 3 Next.js containers behind nginx | ✅ |
| 5 | Varnish CDN: xkey purge, request collapsing, grace, RSC handling | ✅ |
| 6 | Outbox + worker: revalidate, purge, warm | ⏳ next |
| 7 | Warming job + load tests (autocannon / k6) | ⏳ |
| 8 | Same app with Cache Components (`'use cache'`) | ⏳ |

## Next step: Phase 6 (outbox + worker)

Problem it solves: today the edit action expires tags and purges the CDN itself. If the app
crashes between the database update and the purge, the CDN serves the old page until its TTL.

Planned design:
1. `outbox` table (`id, product_id, created_at, processed_at`). The admin action writes the
   product UPDATE and an outbox row **in one transaction**.
2. A `worker` container (Node, BullMQ on Redis or a simple polling loop with
   `SELECT … FOR UPDATE SKIP LOCKED`) processes rows:
   1. compute tags (`product-<id>`, `listing-page-<n>`);
   2. call a protected route handler in the app, e.g. `POST /api/revalidate` with a secret,
      which runs `revalidateTag(tag, { expire: 0 })`;
   3. `PURGE` Varnish with `xkey`;
   4. warm: `GET` the product page and listing page through the CDN so no visitor waits;
   5. mark the row processed; retry on failure.
3. Keep `updateTag` in the action so the owner still sees their change immediately.
4. Show the worker in Dozzle with a `[worker]` log prefix, and update README/PLAN.

## Work log

- **2026-10-02** Discussed and wrote the design (PLAN.md): ISR, Redis placement, tags,
  listings and pagination, request collapsing, multi-pod builds, 1k and 10k req/s sizing,
  CDN choice (Varnish locally; Cloudflare/Fastly for purge by tag in production; CloudFront caveats).
- **2026-10-02** Built phases 1–5 (see Status) and fixed gotchas 1–7 above. Added Dozzle and
  Redis Insight, readable cache logs, and the tools/ scripts.
- **2026-10-03** Published to https://github.com/sidhilsivdas/ecom-next-isr (public, `main`).
  GitHub CLI installed and signed in as sidhilsivdas; `git push` works without extra login.
- **2026-10-03** New Tailwind UI: home page explaining the layers, product cards with category
  gradients, numbered pagination, product detail layout, styled admin form with pending state,
  and a "Cache info" panel (render time, container, tags, live "x min ago"). Fixed the listing
  total (was pages × 24). Checked with headless Edge screenshots at 1280 px and 520 px.
