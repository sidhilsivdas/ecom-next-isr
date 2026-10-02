import os from "node:os";

const instance = process.env.INSTANCE_NAME ?? os.hostname();

/**
 * Shows when and where this HTML was rendered. On a cached (HIT) page this
 * time stays the same across refreshes, which is the easiest way to see ISR.
 * Also logs every render, so `docker compose logs` shows each page build.
 */
export function RenderInfo({ path }: { path: string }) {
  const renderedAt = new Date().toISOString();
  console.log(`[build]  ${path} rendered on ${instance}`);

  return (
    <p className="mt-10 border-t pt-3 text-xs text-gray-500">
      Rendered at {renderedAt} by container <code>{instance}</code>
    </p>
  );
}
