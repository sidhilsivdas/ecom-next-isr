import Link from "next/link";

// Shared by every page, including cached ones, so it must not depend on the
// visitor (no cart count from cookies here).
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-lg text-white shadow-sm">
            ⚡
          </span>
          <span className="text-lg font-semibold tracking-tight">
            ISR <span className="text-brand-600">Shop</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/products/page/1" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
            Products
          </Link>
          <Link
            href="/admin/products/1"
            className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            Seller admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
