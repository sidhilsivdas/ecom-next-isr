"use client";

import { useEffect, useState } from "react";

function describe(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

/**
 * Ticks in the browser. The cached HTML only contains the render time; how
 * long ago that was is worked out here, so the page itself stays cacheable.
 */
export function RenderedAgo({ at }: { at: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return null;
  return <span className="text-slate-500">({describe(now - Date.parse(at))})</span>;
}
