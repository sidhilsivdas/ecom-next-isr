import Link from "next/link";
import { notFound } from "next/navigation";
import { RenderInfo } from "@/components/RenderInfo";
import { formatPrice, getListingPage, getTotalPages, prebuildEnabled } from "@/lib/products";

// Listings show many products, so besides tags they also refresh on a timer:
// at most 60 s old, which catches things tags miss (e.g. new products shifting pages).
export const revalidate = 60;
export const dynamicParams = true;

// Pre-build the first 5 pages; most visitors never go further.
export async function generateStaticParams() {
  if (!prebuildEnabled) return [];
  return [1, 2, 3, 4, 5].map((n) => ({ page: String(n) }));
}

export default async function ListingPage({ params }: PageProps<"/products/page/[page]">) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);
  if (!Number.isInteger(page) || page < 1) notFound();

  const totalPages = await getTotalPages();
  if (page > totalPages) notFound();

  const products = await getListingPage(page);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">All products</h1>
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages.toLocaleString()}
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`} className="block rounded-xl border p-4 hover:shadow">
              <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-3xl">
                {p.category.slice(0, 1).toUpperCase()}
              </div>
              <p className="mt-3 line-clamp-1 font-medium">{p.name}</p>
              <p className="text-sm text-gray-600">{formatPrice(p.priceCents)}</p>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="mt-8 flex items-center justify-between">
        {page > 1 ? (
          <Link href={`/products/page/${page - 1}`} className="rounded-lg border px-4 py-2">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {page < totalPages && (
          <Link href={`/products/page/${page + 1}`} className="rounded-lg border px-4 py-2">
            Next →
          </Link>
        )}
      </nav>

      <RenderInfo path={`/products/page/${page}`} />
    </main>
  );
}
