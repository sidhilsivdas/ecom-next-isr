import type { NextConfig } from "next";

// Phase 2: no REDIS_URL → Next.js uses its default cache (memory + disk, per container).
// Phase 3+: REDIS_URL set → every container shares one cache in Redis.
const useRedisCache = Boolean(process.env.REDIS_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  ...(useRedisCache && {
    cacheHandler: require.resolve("./cache-handler.js"),
    cacheMaxMemorySize: 0, // no per-container memory copy, Redis is the single source
  }),
};

export default nextConfig;
