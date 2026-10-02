# E-commerce with Next.js ISR: The Plan

Goal: learn **ISR (Incremental Static Regeneration)** with a shop of **50,000 products**, edited all day by **200 shop owners**.

---

## 1. ISR in one sentence

**Build a page once, serve it from cache to everyone, and rebuild it only when its data changes.**

| Type | When is the HTML made? | Problem |
|------|------------------------|---------|
| SSG | Once, at build time | 50,000 pages = slow build; edits need a rebuild |
| SSR | On every request | Slow; database hit on every visit |
| **ISR** | At build **or** first visit, then cached, refreshed on change | ✅ Fast like static, fresh like dynamic |

---

## 2. Final architecture

### Local (Docker, for learning)

```
Browser → Varnish (local "CDN") → nginx (load balancer) → web1 / web2 / web3 (Next.js)
                                                                  │
                                                       Redis (shared ISR cache)
                                                                  │
                                                       Postgres (50,000 products)

Admin edit → Postgres + outbox row → worker → revalidate tags in Next.js
                                            → purge tags in Varnish
                                            → warm the page (rebuild immediately)
```

### Production (same design, real services)

```
Users → Cloudflare / Fastly (copies near users, purge by tag)
      → load balancer → Next.js pods (autoscaled) → Redis → Postgres (+ PgBouncer, replicas)
```

nginx is **not** a CDN. Locally, **Varnish** imitates **one** CDN server. A real CDN is many such
servers in many cities, each serving the users closest to it.

---

## 3. What is cached where

| Layer | What it stores | How it is refreshed |
|-------|----------------|---------------------|
| CDN (Varnish locally) | Full pages, near users | Purged by tag (`xkey`) + timer |
| Next.js ISR cache (Redis) | Page HTML + RSC payload + data | `revalidateTag` / `updateTag` + timer |
| Postgres | The real data | Source of truth |

**Never cached:** cart, checkout, stock check at checkout, admin pages.

---

## 4. Tags: the core idea

Every cached page is tagged with the data it shows. Any edit invalidates exactly those tags.

| Page | URL | Tags | Safety timer |
|------|-----|------|--------------|
| Product detail | `/products/5` | `product-5` | 300 s |
| Listing | `/products/page/3` | `listing`, `listing-page-3` | 60 s |

When product 5 changes, the worker works out which listing page shows it and invalidates
`product-5` + `listing-page-N`. The timer catches anything tags miss (e.g. new products shifting pages).

---

## 5. How an edit flows

```
Owner saves product 5
  → Postgres UPDATE + outbox row (same transaction, so no edit can be lost)
  → worker reads outbox
      1. revalidateTag('product-5', 'listing-page-1')   → Redis marks them expired
      2. PURGE Varnish by xkey                           → CDN copy removed
      3. GET /products/5                                 → rebuilt now, cached again
  → next visitor gets the new page from the CDN, nobody waits for a build
```

---

## 6. 5,000 users open the same page at once

```
5,000 users → CDN holds them (request collapsing) → 1 request → pod → Redis
   ├─ in Redis (warmed): no build, ~ms
   └─ not in Redis: 1 build (~30–120 ms), all 5,000 get that result
```

- Inside one Next.js pod: duplicate renders are de-duplicated automatically.
- Across pods: at most one build per pod, unless the CDN collapses them first.

---

## 7. Building 50,000 pages

- `next build` pre-builds **only a few** pages (fast build, small image).
- After deploy, a **warming job** requests every page (rate-limited, popular first) to fill Redis.
- New/edited product → the worker rebuilds it immediately.

---

## 8. Scaling notes (production)

| Load | Key moves |
|------|-----------|
| 1k req/s peak | CDN (~90%+ hits), 3–10 pods, Redis ~8 GB, Postgres + PgBouncer + replica |
| 10k req/s peak | Tiered cache / origin shield, 10–40 pods, in-memory cache in each pod in front of Redis, separate cart/checkout pods, search cluster |

Watch out for:
- **Personal data in cached pages**: reading `cookies()` makes a page dynamic. Load the cart count in the browser.
- **CDN + RSC**: the cache key must respect the `Vary`/`RSC` headers or HTML and RSC payloads get mixed.
- **CloudFront** purges by path and charges per path; Cloudflare/Fastly purge by tag.

---

## 9. Build phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Docker: Postgres + Redis, schema, 50,000-product seed | ✅ |
| 2 | Next.js: product page, listing pages, admin edit with tags (single instance, disk cache) | ✅ |
| 3 | Redis cache handler: shared ISR cache + shared tag state | ✅ |
| 4 | Dockerise Next.js, 3 containers behind nginx | ✅ |
| 5 | Varnish as local CDN (xkey purge, request collapsing, grace) | ✅ |
| 6 | Outbox + BullMQ worker: revalidate, purge, warm | ⏳ |
| 7 | Warming job + load tests (autocannon / k6) | ⏳ |
| 8 | Bonus: same app with Cache Components (`'use cache'`), the newer Next.js 16 model | ⏳ |

See [README.md](README.md) for how to run each phase.

---

## 10. Words to know

- **HIT / MISS / STALE**: served from cache / not cached yet / old copy served while rebuilding (`x-nextjs-cache` header).
- **revalidateTag(tag, 'max')**: mark stale; next visitor gets the old page while it rebuilds.
- **revalidateTag(tag, { expire: 0 }) / updateTag(tag)**: expire now; next visitor waits for a fresh build.
- **Request collapsing**: many identical requests, one fetch.
- **Warming**: requesting pages yourself so users never trigger a build.
- **Outbox**: an events table written in the same transaction as the data change.
