import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice, getListingPageOf, getProductUncached, tags } from "@/lib/products";
import { updateProduct } from "./actions";
import { SubmitButton } from "./SubmitButton";

// Admin pages must always show the real data, so they are never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit product" };

const input =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  const { id: idParam } = await params;
  const { saved } = await searchParams;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const product = await getProductUncached(id);
  if (!product) notFound();
  const listingPage = await getListingPageOf(id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600">Seller admin · shop #{product.shopId}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Edit product #{product.id}</h1>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
          Never cached: always live data
        </span>
      </div>

      {saved && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <p>
            <span className="font-semibold">Saved.</span> The product page and listing page {listingPage} were
            expired in Redis and purged from the CDN.
          </p>
          <Link
            href={`/products/${product.id}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            View product page →
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          action={updateProduct.bind(null, product.id)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input name="name" defaultValue={product.name} required className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea name="description" defaultValue={product.description} rows={4} className={input} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Price (USD)</span>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(product.priceCents / 100).toFixed(2)}
                required
                className={input}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product.stock}
                required
                className={input}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <SubmitButton />
            <Link href={`/products/${product.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Cancel
            </Link>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <ProductImage category={product.category} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-sm text-slate-500">Live price {formatPrice(product.priceCents)}</p>
              <p className="text-sm text-slate-500">{product.stock} in stock</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold">What saving does</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
              <li>Updates Postgres</li>
              <li>
                Expires these tags in Redis:{" "}
                <code className="rounded bg-brand-50 px-1 text-brand-700">{tags.product(product.id)}</code>{" "}
                <code className="rounded bg-brand-50 px-1 text-brand-700">{tags.listingPage(listingPage)}</code>
              </li>
              <li>Purges the same tags from the CDN</li>
              <li>The next visitor gets a freshly built page</li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
