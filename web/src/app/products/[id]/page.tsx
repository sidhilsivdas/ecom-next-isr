import Link from "next/link";
import { notFound } from "next/navigation";
import { RenderInfo } from "@/components/RenderInfo";
import {
  formatPrice,
  getListingPageOf,
  getProduct,
  getTopProductIds,
  prebuildEnabled,
} from "@/lib/products";

// Safety net: even if a tag is never revalidated, rebuild at most every 5 minutes.
export const revalidate = 300;

// Products not built at build time are built on their first visit, then cached.
export const dynamicParams = true;

// Pre-build only the "top" products. The other ~49,000 are built on demand
// (or by the warming job). An empty array still enables ISR for every path.
export async function generateStaticParams() {
  if (!prebuildEnabled) return [];
  const ids = await getTopProductIds(1000);
  return ids.map((id) => ({ id: String(id) }));
}

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const product = await getProduct(id);
  if (!product) notFound();

  const listingPage = await getListingPageOf(id);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href={`/products/page/${listingPage}`} className="text-sm text-blue-600 hover:underline">
        ← Back to listing
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-xl bg-gray-100 text-5xl">
          {product.category.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {product.category} · shop {product.shopId}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
          <p className="mt-3 text-3xl font-bold">{formatPrice(product.priceCents)}</p>
          <p className="mt-1 text-sm text-gray-600">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <p className="mt-4 text-gray-700">{product.description}</p>
          <Link
            href={`/admin/products/${product.id}`}
            className="mt-6 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Edit as shop owner
          </Link>
        </div>
      </div>

      <RenderInfo path={`/products/${id}`} />
    </main>
  );
}
