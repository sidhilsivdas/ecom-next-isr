import Link from "next/link";
import { categoryStyle } from "@/lib/ui";

const categories = ["shoes", "shirts", "bags", "watches", "phones", "books", "toys", "kitchen"];

const layers = [
  {
    name: "CDN (Varnish)",
    port: ":8088",
    text: "Keeps finished pages. Most visits stop here, and the app never sees them.",
  },
  {
    name: "Load balancer (nginx)",
    port: ":8080",
    text: "Spreads the rest across three Next.js containers.",
  },
  {
    name: "Next.js ×3",
    port: "web1–3",
    text: "Builds a page only when no cache has it, or after a seller edits it.",
  },
  {
    name: "Redis",
    port: ":6379",
    text: "Shared ISR cache, so a page built by one container is ready on all three.",
  },
  {
    name: "Postgres",
    port: ":5433",
    text: "50,000 products. Only asked when a page is built.",
  },
];

const tools = [
  { name: "Dozzle", href: "http://localhost:9999", text: "Live logs: hits, builds, edits, purges" },
  { name: "Redis Insight", href: "http://localhost:5540", text: "What's in the shared cache" },
];

// Fully static: built once at build time and served from the CDN.
export default function Home() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
            Incremental Static Regeneration · Next.js 16
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            50,000 products, served from cache.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Every page is built once, cached in Redis and a CDN, and rebuilt only when a seller changes it.
            Edit a price and watch exactly one page rebuild.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products/page/1"
              className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Browse products →
            </Link>
            <Link
              href="/admin/products/1"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Try a seller edit
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-2">
            {categories.map((c) => {
              const style = categoryStyle(c);
              return (
                <span key={c} className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${style.pill}`}>
                  {style.emoji} {c}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">How a page reaches you</h2>
        <p className="mt-2 text-slate-600">Each layer checks its own cache before asking the next one.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {layers.map((layer, i) => (
            <li key={layer.name} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <p className="mt-3 font-semibold">{layer.name}</p>
              <p className="font-mono text-xs text-slate-400">{layer.port}</p>
              <p className="mt-2 text-sm text-slate-600">{layer.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Watch it happen</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <a
              key={tool.name}
              href={tool.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-100 hover:shadow-md"
            >
              <p className="font-semibold group-hover:text-brand-700">{tool.name} ↗</p>
              <p className="font-mono text-xs text-slate-400">{tool.href.replace("http://", "")}</p>
              <p className="mt-2 text-sm text-slate-600">{tool.text}</p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Every product and listing page ends with a <span className="font-medium">Cache info</span> box: if its render
          time doesn&apos;t change when you refresh, the page came from the cache.
        </p>
      </section>
    </main>
  );
}
