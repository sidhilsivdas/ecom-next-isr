import Link from "next/link";
import { formatPrice, type Product } from "@/lib/products";
import { categoryStyle } from "@/lib/ui";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: Product }) {
  const style = categoryStyle(product.category);
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md"
    >
      <ProductImage category={product.category} />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${style.pill}`}>
          {product.category}
        </span>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-brand-700">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-base font-semibold">{formatPrice(product.priceCents)}</span>
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </Link>
  );
}
