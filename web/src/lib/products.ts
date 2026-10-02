import { unstable_cache } from "next/cache";
import { pool } from "./db";
import { tags } from "./tags";

export { tags };

export const PAGE_SIZE = 24;

export type Product = {
  id: number;
  shopId: number;
  category: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  updatedAt: string;
};

const COLUMNS = `id, shop_id AS "shopId", category, name, description,
  price_cents AS "priceCents", stock, updated_at AS "updatedAt"`;

// ---------- Uncached queries (admin, worker, build-time lists) ----------

export async function getProductUncached(id: number): Promise<Product | null> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Which listing page shows this product (listings are sorted by id). */
export async function getListingPageOf(id: number): Promise<number> {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM products WHERE id <= $1", [id]);
  return Math.max(1, Math.ceil(rows[0].n / PAGE_SIZE));
}

export async function getTopProductIds(limit: number): Promise<number[]> {
  // Stand-in for "most popular": the real app would rank by views or sales.
  const { rows } = await pool.query("SELECT id FROM products ORDER BY id LIMIT $1", [limit]);
  return rows.map((r) => r.id);
}

// ---------- Cached queries (used by ISR pages) ----------
// unstable_cache stores the result in the Next.js cache (disk by default,
// Redis once the custom cache handler is on). Its tags are also attached to
// the page that used it, so revalidating a tag invalidates the page too.

export function getProduct(id: number) {
  return unstable_cache(() => getProductUncached(id), ["product", String(id)], {
    tags: [tags.product(id)],
  })();
}

export function getListingPage(page: number) {
  return unstable_cache(
    async (): Promise<Product[]> => {
      const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM products ORDER BY id LIMIT $1 OFFSET $2`,
        [PAGE_SIZE, (page - 1) * PAGE_SIZE],
      );
      return rows;
    },
    ["listing-page", String(page)],
    { tags: [tags.listing, tags.listingPage(page)] },
  )();
}

export const getProductCount = unstable_cache(
  async (): Promise<number> => {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM products");
    return rows[0].n;
  },
  ["product-count"],
  { tags: [tags.listing] },
);

export async function getTotalPages() {
  return Math.max(1, Math.ceil((await getProductCount()) / PAGE_SIZE));
}

// ---------- Helpers ----------

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** True when the build should pre-render pages (needs a reachable database). */
export const prebuildEnabled = process.env.PREBUILD !== "0";
