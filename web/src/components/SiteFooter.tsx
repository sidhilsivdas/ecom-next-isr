export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>ISR Shop: a learning project for Next.js Incremental Static Regeneration.</p>
        <p>50,000 products · 200 shops · cached in Redis and a CDN</p>
      </div>
    </footer>
  );
}
