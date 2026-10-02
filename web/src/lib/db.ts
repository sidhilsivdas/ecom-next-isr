import { Pool } from "pg";

// One pool per server process. In dev, hot reload re-runs this module,
// so keep the pool on globalThis to avoid leaking connections.
const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://shop:shop@localhost:5433/shop",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;
