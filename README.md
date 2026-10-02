# ISR Shop

A Next.js 16 store with 50,000 products, built to learn Incremental Static Regeneration.
The design and the reasoning behind it are in [PLAN.md](PLAN.md).

```
Browser → Varnish :8088 (local CDN) → nginx :8080 (load balancer) → web1 / web2 / web3 (Next.js)
                                                                        → Redis (shared ISR cache)
                                                                        → Postgres :5433 (products)
```

Two caches, one in front of the other:

| Cache | Where | Holds | Emptied by |
|-------|-------|-------|------------|
| **CDN** (Varnish) | In front of everything | Finished pages | Edit → PURGE by tag (`xkey`), or its TTL (300 s products, 60 s listings) |
| **ISR cache** (Redis) | Behind Next.js | Finished pages + database query results | Edit → `updateTag`, or the page's `revalidate` timer |

A request that hits the CDN never reaches Next.js or Redis at all.

## Project layout

| Path | What it is |
|------|------------|
| `docker-compose.yml` | Postgres, Redis, 3 Next.js containers, nginx, Varnish, Redis Insight, Dozzle |
| `db/init/` | Schema + 50,000-product seed (runs on first Postgres start) |
| `web/src/lib/tags.ts` | Tag names (`product-5`, `listing-page-3`), shared by every layer |
| `web/src/lib/products.ts` | Queries; cached ones carry the tags |
| `web/src/app/products/[id]` | Product page (ISR, 300 s safety timer) |
| `web/src/app/products/page/[page]` | Listing pages (ISR, 60 s timer) |
| `web/src/app/admin/products/[id]` | Edit form; the server action expires the tags and purges the CDN |
| `web/src/proxy.ts` | Adds the `xkey` header (the page's tags) for the CDN |
| `web/src/lib/cdn.ts` | Purges the CDN by tag |
| `web/cache-handler.js` | Shared ISR cache in Redis |
| `cdn/default.vcl` | Varnish config: caching, grace, purge by tag |
| `lb/nginx.conf` | Round-robin load balancer |
| `tools/` | Scripts to watch the caches work |

## Run it

Requires Docker Desktop and Node.js.

```bash
cd web
npm install
npm run build:docker      # builds the app on your machine (see "Why build on the host")
cd ..
docker compose up -d --build
```

| URL | What |
|-----|------|
| http://localhost:8088 | **The shop, through the CDN.** Use this one |
| http://localhost:8080 | The shop without the CDN (straight to the load balancer) |
| http://localhost:8088/admin/products/1 | Edit a product as a shop owner |
| http://localhost:9999 | Dozzle: live logs of the CDN and the app |
| http://localhost:5540 | Redis Insight: what's in the ISR cache |

Each page footer shows **when** and **by which container** it was rendered.

Port 8000 was taken on this machine, so the CDN is on 8088.

### Single instance, default cache (no Docker for Next.js)

```bash
docker compose up -d postgres redis
cd web
npm run build             # pre-builds 1,000 products + 5 listing pages from the database
npm start                 # http://localhost:3000 (a warning about "standalone" is expected)
```

## Watch the caches

### In a GUI

| Tool | URL | What to look at |
|------|-----|-----------------|
| Dozzle (logs) | http://localhost:9999 | Select cdn, web1, web2, web3 together; filter `[cdn]`, `[cache]`, `[build]` or `[edit]` |
| Redis Insight | http://localhost:5540 | Database `isr-cache`: cached pages (`isr:*`), edited tags (`isr:tags`). **Profiler** (bottom bar) shows every GET/SET live |
| Browser DevTools | F12 → Network | Response headers `X-Cache` (CDN), `x-nextjs-cache` (Next.js), `xkey`, `x-served-by` |
| Docker Desktop | Containers → cdn / web1 → Logs | Same logs as Dozzle, one container at a time |

#### Dozzle: watch the CDN, builds and edits live

Open http://localhost:9999. Click **cdn**, then Ctrl+click **web1**, **web2** and **web3** to
merge them into one view. Type `[cdn]`, `[build]`, `[edit]` or `[cache]` in the search box to filter.

CDN lines (container `cdn`):

| Log line | Meaning |
|----------|---------|
| `[cdn] hit` | Served by the CDN; the app never saw the request |
| `[cdn] miss` | Not in the CDN; fetched from the app, now stored |
| `[cdn] pass` | Never cached (admin pages, edits) |
| `[cdn] synth 200 PURGE` | An edit removed pages from the CDN by tag |

App lines (containers `web1`–`web3`):

| Log line | Meaning |
|----------|---------|
| `[cache] MISS` | Not in Redis yet; the page will be built |
| `[build]` | A page was rendered (the database was queried) |
| `[cache] SAVED` | The new version was written to Redis |
| `[cache] HIT` | Served from Redis; nothing was built |
| `[edit]` | A shop owner saved a product |
| `[cache] TAGS` | The tags that edit expired in Redis |
| `[cdn] purge` | The same tags purged from the CDN, with Varnish's reply |
| `[cache] EXPIRED` | The page's tag was expired by an edit; it is rebuilt now |

`data [...]` lines are cached database queries (`getProduct`, `getListingPage`), stored
separately from the finished pages.

#### Redis Insight: see what's in the ISR cache

Open http://localhost:5540, accept the terms on first launch, then click the **isr-cache** database.

- **Browse** lists every cached entry:
  - `isr:<build>:/route-cache/APP_PAGE/…/$/products/100` is a full cached page (HTML + RSC payload).
  - `isr:tags` lists the tags expired by edits, with timestamps.
- **Profiler** (bottom bar → Profiler → Start) shows every Redis command live:
  - `GET`: a page or query was read from the cache.
  - `SET`: a page or query was built and saved.
  - `HSET isr:tags`: an edit expired some tags.

If the `isr-cache` connection is ever missing, add it with host `redis`, port `6379`.

#### Seeing it all at once

Put Dozzle (cdn + web1–3) and Redis Insight's Profiler side by side, then:

| Step | Do this | CDN log | App log | Profiler |
|------|---------|---------|---------|----------|
| 1 | Open http://localhost:8088/products/999 | `miss` | `MISS` → `[build]` → `SAVED` | `GET` (nothing found), `SET` |
| 2 | Refresh it | `hit` | nothing | nothing |
| 3 | Open it on http://localhost:8080 (no CDN) | nothing | `HIT` | `GET` only |
| 4 | Edit it at http://localhost:8088/admin/products/999 | `pass` (POST), `synth PURGE` | `[edit]`, `TAGS`, `[cdn] purge` | `HSET isr:tags` |
| 5 | Open http://localhost:8088/products/999 again | `miss` | `EXPIRED` → `[build]` → `SAVED` | `GET`, then a new `SET` |
| 6 | Refresh it | `hit` | nothing | nothing |

Step 2 is the point of a CDN: the app and Redis do no work at all.

The page footer ("Rendered at … by container web2") tells the same story: the time stays the
same on a cache hit and changes when the page is rebuilt.

### From the terminal

Run these from the project root in Git Bash.

```bash
# Live feed of HIT / MISS / build / edit events from the app containers (leave it running)
bash tools/watch.sh

# Cache status at each layer, render time, which container rendered it
bash tools/check.sh http://localhost:8088 /products/777

# Edit a product like a shop owner would
bash tools/edit.sh http://localhost:8088 777 29.99

# 300 concurrent requests to a page, then count how many renders happened
bash tools/burst.sh /products/12345 300                         # through the CDN
bash tools/burst.sh /products/12346 300 http://localhost:8080   # without the CDN

# Purge the CDN by tag by hand
curl -X PURGE -H "xkey: product-777" http://localhost:8088/

# Look inside Redis
docker compose exec redis redis-cli --scan --pattern 'isr:*'
docker compose exec redis redis-cli hgetall isr:tags

# CDN statistics (hits, misses, objects stored)
docker compose exec cdn varnishstat -1 -f MAIN.cache_hit -f MAIN.cache_miss -f MAIN.n_object
```

Response headers:

| Header | Set by | Values |
|--------|--------|--------|
| `X-Cache` | CDN | `HIT (hits: n)` served by the CDN · `MISS` fetched from the app |
| `x-nextjs-cache` | Next.js | `MISS` rendered now · `HIT` from Redis · `STALE` old copy, rebuilding in the background · `REVALIDATED` expired by a tag, rebuilt for this request |
| `xkey` | Next.js (proxy.ts) | The page's tags, used by the CDN to purge |

On a CDN hit, `x-nextjs-cache` is what Next.js said when the CDN **last fetched** the page.

To start from empty caches: `docker compose exec redis redis-cli flushall` and
`docker compose restart cdn`.

## What you should see

- **First visit** to a page: CDN `MISS`, Next.js `MISS`. After that: CDN `HIT`, and the app does nothing.
- **After an edit**: the CDN copy is purged and the Redis copy expired. The next visit rebuilds
  the page once with the new price; then it's a CDN `HIT` again. The listing page that shows the
  product is purged and rebuilt too.
- **300 requests at once** to a page that hasn't been built (measured):

  | Path | Requests reaching the app | Builds |
  |------|---------------------------|--------|
  | Without the CDN (port 8080) | 300 | 3 (one per container) |
  | Through the CDN (port 8088) | **1** | **1** |

  The CDN held 299 requests while the first one was fetched, then served them all the same copy
  (its log shows 1 `miss` and 299 `hit`). This is request collapsing.

## How an edit reaches every cache

```
Owner saves product 5 (POST passes through the CDN)
  → Postgres UPDATE
  → updateTag('product-5', 'listing-page-1')   Redis: those entries are now expired
  → after the response: PURGE xkey: product-5 listing-page-1   CDN: those pages removed
  → next visitor: CDN miss → Next.js rebuilds once → stored in Redis and the CDN
```

The purge runs in `after()`, once Next.js has expired the tags. Purging first would let a
visitor arriving in between put the old page back into the CDN.

Phase 6 moves these steps into a background worker fed by an outbox table, so no edit is lost
if the app crashes between saving and purging.

## The CDN and in-app navigation

Clicking a link inside the app doesn't load HTML. The browser fetches the page's **RSC payload**
(`text/x-component`) from the same URL plus `?_rsc=<hash>` and an `RSC: 1` header. The CDN must
never give one visitor's HTML request the RSC payload, or the reverse. Here:

- the `_rsc` parameter gives the payload its own cache entry, and Next.js's `Vary: rsc, …`
  header is respected as well;
- both carry the same `xkey` tags, so one purge removes both (`Purged 2 objects`);
- an RSC request **without** `_rsc` only gets a redirect, so Varnish passes it instead of
  marking the URL "don't cache".

On a real CDN this is the part to get right: the cache key must include `_rsc` (or the `RSC`
headers). CloudFront, for example, ignores most of `Vary` by default.

## Why build on the host

`npm install` inside Docker fails on this machine: HTTPS requests from containers to the npm
registry fail certificate checks, which usually means antivirus or a proxy is inspecting traffic.
So `npm run build:docker` builds on the host, and the image only copies the output.
The script also fixes two Windows-specific problems in that output:

1. The cache handler path is stored as `..\cache-handler.js`, which Linux can't load.
2. Turbopack's package links (`.next/node_modules/pg-<hash>`) point at `C:\...` paths.

## Proxies must forward the host with its port

Next.js rejects a server action (the edit form) when the browser's `Origin` header doesn't
match the `Host` / `X-Forwarded-Host` it receives; this protects against cross-site form posts.
nginx's `$host` drops the port (`localhost` vs `localhost:8088`), so nginx forwards
`$http_host` instead. Varnish passes the `Host` header through unchanged.

## Two things the Redis cache handler has to do

Found while building this, and the reason the handler is more than get/set:

1. **Share tag timestamps.** Next.js decides whether a page is stale using tag timestamps it
   keeps in memory in each container. The handler copies them from Redis on every read, so an
   edit handled by web2 expires the page on web1 and web3 too.
2. **Share page lifetimes.** A page's `revalidate` time is also kept only in memory, in the
   container that rendered it. Without sharing it, other containers assume 1 second and serve
   the page as `STALE`, re-rendering it in the background.
