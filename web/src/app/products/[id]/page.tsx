import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { RenderInfo } from "@/components/RenderInfo";
import { StockBadge } from "@/components/StockBadge";
import {
  formatPrice,
  getListingPageOf,
  getProduct,
  getTopProductIds,
  prebuildEnabled,
} from "@/lib/products";
import { categoryStyle } from "@/lib/ui";

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

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = Number.isInteger(Number(id)) ? await getProduct(Number(id)) : null;
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const product = await getProduct(id);
  if (!product) notFound();

  const listingPage = await getListingPageOf(id);
  const style = categoryStyle(product.category);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/products/page/${listingPage}`} className="hover:text-brand-700">
          Products
        </Link>
        <span>/</span>
        <span className="capitalize">{product.category}</span>
        <span>/</span>
        <span className="truncate text-slate-800">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <div className="mx-auto w-full max-w-md md:max-w-none">
          <ProductImage category={product.category} size="lg" />
        </div>

        <div className="flex flex-col">
          <span className={`self-start rounded-full px-3 py-1 text-xs font-medium capitalize ${style.pill}`}>
            {product.category}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-sm text-slate-500">Sold by shop #{product.shopId}</p>

          <div className="mt-6 flex items-center gap-4">
            <p data-price={product.priceCents} className="text-4xl font-bold text-slate-900">
              {formatPrice(product.priceCents)}
            </p>
            <StockBadge stock={product.stock} />
          </div>
          {product.stock > 0 && <p className="mt-1 text-sm text-slate-500">{product.stock} units available</p>}

          <p className="mt-6 leading-relaxed text-slate-700">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              title="This demo store has no cart"
              className="cursor-not-allowed rounded-xl bg-brand-600 px-6 py-3 font-medium text-white opacity-60"
            >
              Add to cart
            </button>
            <Link
              href={`/admin/products/${product.id}`}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit as seller
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-400">Demo store: there is no cart or checkout.</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div>
              <dt className="text-slate-500">Product ID</dt>
              <dd className="font-medium">#{product.id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-medium">
                {new Date(product.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <RenderInfo path={`/products/${id}`} revalidate={revalidate} />
    </main>
  );
}
