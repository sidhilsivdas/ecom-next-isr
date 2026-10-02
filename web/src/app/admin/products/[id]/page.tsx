import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductUncached } from "@/lib/products";
import { updateProduct } from "./actions";

// Admin pages must always show the real data, so they are never cached.
export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Edit product #{product.id}</h1>
      <p className="text-sm text-gray-500">Shop {product.shopId} · admin page (never cached)</p>

      {saved && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Saved. The cached product page and its listing page were expired.{" "}
          <Link href={`/products/${product.id}`} className="underline">
            View product page
          </Link>
        </p>
      )}

      <form action={updateProduct.bind(null, product.id)} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input name="name" defaultValue={product.name} required className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            defaultValue={product.description}
            rows={3}
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Price (USD)</span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(product.priceCents / 100).toFixed(2)}
              required
              className="mt-1 w-full rounded-lg border p-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Stock</span>
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              defaultValue={product.stock}
              required
              className="mt-1 w-full rounded-lg border p-2"
            />
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
          Save
        </button>
      </form>
    </main>
  );
}
