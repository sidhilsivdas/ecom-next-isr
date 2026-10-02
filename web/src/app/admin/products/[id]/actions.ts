"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { purgeCdn } from "@/lib/cdn";
import { pool } from "@/lib/db";
import { getListingPageOf, tags } from "@/lib/products";

export async function updateProduct(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));

  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    throw new Error("Invalid product data");
  }

  await pool.query(
    `UPDATE products
        SET name = $1, description = $2, price_cents = $3, stock = $4, updated_at = now()
      WHERE id = $5`,
    [name, description, Math.round(price * 100), stock, id],
  );

  // Expire every cached page that shows this product. updateTag (not
  // revalidateTag 'max') because the owner should see their own change
  // right away, not the old page once more.
  const listingPage = await getListingPageOf(id);
  const expired = [tags.product(id), tags.listingPage(listingPage)];
  expired.forEach(updateTag);
  console.log(`[edit]   product ${id} saved → expiring /products/${id} and /products/page/${listingPage}`);

  // Then remove the CDN copies. after() runs once the action has finished,
  // so Next.js has already expired the tags: a request reaching the CDN
  // right after the purge gets the new page, not the old one again.
  after(() => purgeCdn(expired));

  redirect(`/admin/products/${id}?saved=1`);
}
