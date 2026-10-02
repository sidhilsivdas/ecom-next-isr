import Link from "next/link";
import { pageWindow } from "@/lib/ui";

const base = "grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-medium";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const href = (p: number) => `/products/page/${p}`;

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} border border-slate-200 bg-white hover:bg-slate-50`}>
          ← Prev
        </Link>
      ) : (
        <span className={`${base} border border-slate-100 text-slate-300`}>← Prev</span>
      )}

      {pageWindow(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${base} bg-brand-600 text-white shadow-sm`}>
            {p.toLocaleString()}
          </span>
        ) : (
          <Link key={p} href={href(p)} className={`${base} border border-slate-200 bg-white hover:bg-slate-50`}>
            {p.toLocaleString()}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={`${base} border border-slate-200 bg-white hover:bg-slate-50`}>
          Next →
        </Link>
      ) : (
        <span className={`${base} border border-slate-100 text-slate-300`}>Next →</span>
      )}
    </nav>
  );
}
