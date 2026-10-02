/**
 * Removes every CDN copy carrying any of these tags.
 * Locally the CDN is Varnish (PURGE + xkey header). With Cloudflare or Fastly
 * this would be one call to their purge-by-tag API instead.
 */
export async function purgeCdn(cdnTags: string[]) {
  const url = process.env.CDN_PURGE_URL;
  if (!url || cdnTags.length === 0) return;

  try {
    const res = await fetch(url, {
      method: "PURGE",
      headers: { xkey: cdnTags.join(" ") },
      signal: AbortSignal.timeout(2000),
    });
    console.log(`[cdn]    purge ${cdnTags.join(", ")} → ${res.status} ${await res.text()}`);
  } catch (err) {
    // The CDN copy then lives until its TTL runs out (300 s for products).
    console.error(`[cdn]    purge ${cdnTags.join(", ")} failed:`, (err as Error).message);
  }
}
