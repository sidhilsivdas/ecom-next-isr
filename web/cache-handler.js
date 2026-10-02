// Shared ISR cache in Redis.
//
// Every Next.js container reads and writes the same Redis, so a page built
// by container A is a HIT on container B, and an edit handled by container B
// expires the page for everyone.
//
// Redis layout:
//   isr:<buildId>:<key>  → one cache entry (page HTML + RSC payload, or cached data)
//   isr:tags             → hash: tag → {"stale": ms, "expired": ms}
//
// How staleness works in Next.js 16: after get() returns an entry, Next.js
// compares the entry's lastModified with the tag timestamps it holds in its
// in-process tags manifest. The default handler only updates that manifest in
// the container that called revalidateTag. Here, get() copies the tag
// timestamps from Redis into the manifest first, so every container agrees.
//
// The same goes for a page's lifetime (`revalidate = 300`): Next.js keeps it
// in memory in the container that rendered the page. Any other container
// would assume 1 second and treat the page as STALE straight away. So the
// lifetime is stored with the entry and restored on get().

const fs = require("node:fs");
const path = require("node:path");
const Redis = require("ioredis");
const {
  tagsManifest,
  areTagsExpired,
  areTagsStale,
} = require("next/dist/server/lib/incremental-cache/tags-manifest.external");
const { SharedCacheControls } = require("next/dist/server/lib/incremental-cache/shared-cache-controls.external");

const TAGS_KEY = "isr:tags";
const TAGS_HEADER = "x-next-cache-tags";
const debug = process.env.CACHE_DEBUG === "1";

let client;
function redis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      // Commands sent before the connection opens wait for it (the first
      // requests after startup would otherwise all be misses)...
      enableOfflineQueue: true,
      // ...but never longer than 1 s: if Redis is down, pages still render.
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
    });
    client.on("error", (err) => debug && console.error("[cache] redis error", err.message));
  }
  return client;
}

// Cache entries contain Buffers (RSC payload) and Maps (segment data), which
// JSON can't represent, so tag them on the way in and restore them on the way out.
function encode(value) {
  if (Buffer.isBuffer(value)) return { __buf: value.toString("base64") };
  if (value instanceof Map) return { __map: [...value].map(([k, v]) => [k, encode(v)]) };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = encode(v);
    return out;
  }
  return value;
}

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    if (typeof value.__buf === "string") return Buffer.from(value.__buf, "base64");
    if (Array.isArray(value.__map)) return new Map(value.__map.map(([k, v]) => [k, decode(v)]));
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = decode(v);
    return out;
  }
  return value;
}

// Readable name for logs. Page keys look like
// "/route-cache/APP_PAGE/<hash>/$/products/777"; data keys are hashes, so show their tags.
function label(key, ctx) {
  const marker = key.indexOf("/$/");
  if (marker !== -1) return `page ${key.slice(marker + 2)}`;
  const tags = (ctx?.tags ?? []).filter((t) => !t.startsWith("_N_T_"));
  return `data [${tags.join(", ") || key.slice(0, 12)}]`;
}

function readBuildId(serverDistDir) {
  try {
    return fs.readFileSync(path.join(serverDistDir, "..", "BUILD_ID"), "utf8").trim();
  } catch {
    return "dev";
  }
}

module.exports = class RedisCacheHandler {
  constructor(options) {
    // Separate entries per build: new code may render pages differently.
    this.prefix = `isr:${readBuildId(options.serverDistDir)}:`;
  }

  async get(key, ctx) {
    try {
      const raw = await redis().get(this.prefix + key);
      if (!raw) {
        if (debug) console.log(`[cache] MISS     ${label(key, ctx)} → will be built`);
        return null;
      }
      const entry = decode(JSON.parse(raw));

      const tags =
        ctx?.kind === "FETCH"
          ? [...(ctx.tags ?? []), ...(ctx.softTags ?? [])]
          : String(entry.value?.headers?.[TAGS_HEADER] ?? "").split(",").filter(Boolean);
      await this.syncTags(tags);
      if (entry.cacheControl) SharedCacheControls.cacheControls.set(key, entry.cacheControl);

      if (debug) {
        // Next.js makes the final call; this predicts it from the tag timestamps.
        const verdict = areTagsExpired(tags, entry.lastModified)
          ? "EXPIRED  (edited) → rebuild now"
          : areTagsStale(tags, entry.lastModified)
            ? "STALE    (edited) → serve old, rebuild in background"
            : "HIT     ";
        console.log(`[cache] ${verdict} ${label(key, ctx)}`);
      }
      return entry;
    } catch (err) {
      // A cache failure must never break the page: treat it as a miss.
      if (debug) console.error("[cache] get failed", label(key, ctx), err.message);
      return null;
    }
  }

  async set(key, data, ctx) {
    try {
      const entry = {
        value: data,
        lastModified: Date.now(),
        tags: ctx?.tags ?? [],
        cacheControl: ctx?.cacheControl, // page lifetime, e.g. { revalidate: 300, expire: ... }
      };
      await redis().set(this.prefix + key, JSON.stringify(encode(entry)));
      if (debug) console.log(`[cache] SAVED    ${label(key, ctx)}`);
    } catch (err) {
      if (debug) console.error("[cache] set failed", label(key, ctx), err.message);
    }
  }

  // Called by revalidateTag() / updateTag() / revalidatePath().
  // durations.expire is in seconds: 'max' ≈ 1 year (serve stale while
  // rebuilding), { expire: 0 } or updateTag = expired now (next visitor waits).
  async revalidateTag(tags, durations) {
    tags = [tags].flat();
    if (tags.length === 0) return;
    const now = Date.now();

    try {
      const existing = await redis().hmget(TAGS_KEY, ...tags);
      const updates = {};
      tags.forEach((tag, i) => {
        const prev = existing[i] ? JSON.parse(existing[i]) : {};
        const next = durations
          ? { ...prev, stale: now, ...(durations.expire !== undefined && { expired: now + durations.expire * 1000 }) }
          : { ...prev, expired: now };
        updates[tag] = JSON.stringify(next);
        tagsManifest.set(tag, next);
      });
      await redis().hset(TAGS_KEY, updates);
      if (debug) {
        const how = !durations || durations.expire === 0 ? "expired now" : "marked stale";
        console.log(`[cache] TAGS     ${tags.join(", ")} ${how}`);
      }
    } catch (err) {
      console.error("[cache] revalidateTag failed", tags, err.message);
    }
  }

  async syncTags(tags) {
    if (tags.length === 0) return;
    const values = await redis().hmget(TAGS_KEY, ...tags);
    tags.forEach((tag, i) => {
      if (values[i]) tagsManifest.set(tag, JSON.parse(values[i]));
    });
  }

  resetRequestCache() {}
};
