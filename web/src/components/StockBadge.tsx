export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Out of stock</span>;
  }
  if (stock < 10) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Only {stock} left
      </span>
    );
  }
  return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">In stock</span>;
}
