import { NextResponse, type NextRequest } from "next/server";
import { cdnTagsForPath } from "@/lib/tags";

// Tells the CDN which tags each page carries, so an edit can purge exactly
// those pages. Varnish reads `xkey`; Cloudflare reads `Cache-Tag` and Fastly
// `Surrogate-Key`, so in production only the header name changes.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const cdnTags = cdnTagsForPath(request.nextUrl.pathname);
  if (cdnTags.length > 0) response.headers.set("xkey", cdnTags.join(" "));
  return response;
}

export const config = {
  matcher: "/products/:path*",
};
