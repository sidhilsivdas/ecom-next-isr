import os from "node:os";
import { cdnTagsForPath } from "@/lib/tags";
import { RenderedAgo } from "./RenderedAgo";

const instance = process.env.INSTANCE_NAME ?? os.hostname();

/**
 * Shows when and where this HTML was rendered. On a cached (HIT) page this
 * time stays the same across refreshes, which is the easiest way to see ISR.
 * Also logs every render, so `docker compose logs` shows each page build.
 */
export function RenderInfo({ path, revalidate }: { path: string; revalidate: number }) {
  const renderedAt = new Date().toISOString();
  console.log(`[build]  ${path} rendered on ${instance}`);

  return (
    <aside className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-600">
      <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Cache info</p>
      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Rendered at</dt>
        <dd>
          <time data-rendered-at={renderedAt} className="font-mono">
            {renderedAt}
          </time>{" "}
          <RenderedAgo at={renderedAt} />
        </dd>
        <dt className="text-slate-500">Rendered by</dt>
        <dd>
          <code data-rendered-by={instance} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
            {instance}
          </code>
        </dd>
        <dt className="text-slate-500">Tags</dt>
        <dd className="flex flex-wrap gap-1.5">
          {cdnTagsForPath(path).map((tag) => (
            <code key={tag} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-brand-700">
              {tag}
            </code>
          ))}
        </dd>
        <dt className="text-slate-500">Safety timer</dt>
        <dd>rebuilt at most every {revalidate} s, or right after an edit</dd>
      </dl>
      <p className="mt-3 text-slate-500">
        Refresh: if the render time stays the same, this page came from the cache.
      </p>
    </aside>
  );
}
