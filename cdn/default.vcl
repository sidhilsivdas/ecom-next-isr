# Varnish acting as ONE CDN server (a real CDN is many of these, in many cities).
#
#   Browser → Varnish :8088 → nginx (lb) → web1 / web2 / web3
#
# What it does:
#   - caches pages using Next.js's Cache-Control (s-maxage = TTL)
#   - holds identical requests while one fetch runs (request collapsing, built in)
#   - serves the old copy while fetching a new one (grace)
#   - removes pages by tag on PURGE, using the xkey header Next.js adds
vcl 4.1;

import xkey;

backend lb {
  .host = "lb";
  .port = "80";
}

# Who may purge. Locally: anything on the Docker network (the Next.js containers,
# and your machine through the published port). In production this is the
# worker's address only.
acl purgers {
  "localhost";
  "172.16.0.0"/12;
}

sub vcl_recv {
  if (req.method == "PURGE") {
    if (client.ip !~ purgers) {
      return (synth(403, "Forbidden"));
    }
    if (!req.http.xkey) {
      return (synth(400, "xkey header required"));
    }
    # Remove every object tagged with any of these keys (space-separated)
    set req.http.n-gone = xkey.purge(req.http.xkey);
    return (synth(200, "Purged " + req.http.n-gone + " objects"));
  }

  # Edits (POST) and admin pages always go to the app
  if (req.method != "GET" && req.method != "HEAD") {
    return (pass);
  }
  if (req.url ~ "^/admin") {
    return (pass);
  }

  # Client-side navigation fetches the page's RSC payload from the same URL
  # plus ?_rsc=<hash>, so HTML and RSC are cached as separate entries (Next.js
  # also sends Vary: rsc). An RSC request without _rsc only gets a redirect;
  # pass it, or Varnish would mark the HTML URL "don't cache" for 2 minutes.
  if (req.http.rsc && req.url !~ "[?&]_rsc") {
    return (pass);
  }

  # Cached pages are identical for everyone. Dropping cookies keeps all
  # visitors on one cache entry, which is also what allows request collapsing.
  unset req.http.Cookie;
  return (hash);
}

sub vcl_backend_response {
  # Never keep errors
  if (beresp.status >= 500) {
    set beresp.ttl = 0s;
    set beresp.uncacheable = true;
    return (deliver);
  }

  # TTL comes from Next.js: s-maxage=300 for products, 60 for listings.
  # Next.js also sends stale-while-revalidate of ~1 year; keep old copies
  # for at most 1 hour after they expire instead.
  if (beresp.ttl > 0s) {
    set beresp.grace = 1h;
  }
}

sub vcl_synth {
  # Short plain-text replies for PURGE (instead of Varnish's HTML error page)
  if (req.method == "PURGE") {
    set resp.http.Content-Type = "text/plain";
    set resp.body = resp.reason;
    return (deliver);
  }
}

sub vcl_deliver {
  # X-Cache is the CDN's answer; x-nextjs-cache is what Next.js said when
  # the CDN last fetched the page.
  if (obj.hits > 0) {
    set resp.http.X-Cache = "HIT (hits: " + obj.hits + ")";
  } else {
    set resp.http.X-Cache = "MISS";
  }
}
