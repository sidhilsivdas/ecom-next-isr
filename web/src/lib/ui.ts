// Visual style per category. Products have no photos, so each category gets
// an emoji on its own gradient. Full class names are written out so Tailwind
// can find them when it scans the source.
const categoryStyles: Record<string, { emoji: string; gradient: string; pill: string }> = {
  shoes: { emoji: "👟", gradient: "from-orange-100 to-rose-200", pill: "bg-orange-100 text-orange-800" },
  shirts: { emoji: "👕", gradient: "from-sky-100 to-blue-200", pill: "bg-sky-100 text-sky-800" },
  bags: { emoji: "🎒", gradient: "from-amber-100 to-yellow-200", pill: "bg-amber-100 text-amber-800" },
  watches: { emoji: "⌚", gradient: "from-slate-100 to-slate-300", pill: "bg-slate-200 text-slate-800" },
  phones: { emoji: "📱", gradient: "from-violet-100 to-purple-200", pill: "bg-violet-100 text-violet-800" },
  books: { emoji: "📚", gradient: "from-emerald-100 to-teal-200", pill: "bg-emerald-100 text-emerald-800" },
  toys: { emoji: "🧸", gradient: "from-pink-100 to-fuchsia-200", pill: "bg-pink-100 text-pink-800" },
  kitchen: { emoji: "🍳", gradient: "from-lime-100 to-green-200", pill: "bg-lime-100 text-lime-800" },
};

const fallback = { emoji: "📦", gradient: "from-gray-100 to-gray-200", pill: "bg-gray-100 text-gray-800" };

export function categoryStyle(category: string) {
  return categoryStyles[category] ?? fallback;
}

/** Page numbers to show around the current page, with null for "…". */
export function pageWindow(current: number, total: number, radius = 2): (number | null)[] {
  const pages = new Set([1, total]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}
