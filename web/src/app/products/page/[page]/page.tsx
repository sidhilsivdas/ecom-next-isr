import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { ProductCard } from "@/components/ProductCard";
import { RenderInfo } from "@/components/RenderInfo";
import { getListingPage, getProductCount, getTotalPages, PAGE_SIZE, prebuildEnabled } from "@/lib/products";

// Listings show many products, so besides tags they also refresh on a timer:
// at most 60 s old, which catches things tags miss (e.g. new products shifting pages).
export const revalidate = 60;
export const dynamicParams = true;

// Pre-build the first 5 pages; most visitors never go further.
export async function generateStaticParams() {
  if (!prebuildEnabled) return [];
  return [1, 2, 3, 4, 5].map((n) => ({ page: String(n) }));
}

export async function generateMetadata({ params }: PageProps<"/products/page/[page]">): Promise<Metadata> {
  const { page } = await params;
  return { title: `All products · page ${page}` };
}

export default async function ListingPage({ params }: PageProps<"/products/page/[page]">) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);
  if (!Number.isInteger(page) || page < 1) notFound();

  const [totalPages, productCount] = await Promise.all([getTotalPages(), getProductCount()]);
  if (page > totalPages) notFound();

  const products = await getListingPage(page);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + products.length - 1;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Showing {first.toLocaleString()}–{last.toLocaleString()} of {productCount.toLocaleString()}
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Page <span className="font-medium text-slate-800">{page.toLocaleString()}</span> of{" "}
          {totalPages.toLocaleString()}
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} />

      <RenderInfo path={`/products/page/${page}`} revalidate={revalidate} />
    </main>
  );
}
