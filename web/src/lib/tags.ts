// Cache tag names, shared by the cached queries, the edit action, the CDN
// header (proxy.ts) and the CDN purge, so they can't drift apart.
// Kept free of imports: proxy.ts loads this file on every request.

export const tags = {
  product: (id: number) => `product-${id}`,
  listing: "listing",
  listingPage: (page: number) => `listing-page-${page}`,
};

/** Tags the CDN should attach to a page, from its URL. */
export function cdnTagsForPath(pathname: string): string[] {
  const listing = pathname.match(/^\/products\/page\/(\d+)$/);
  if (listing) return [tags.listing, tags.listingPage(Number(listing[1]))];

  const product = pathname.match(/^\/products\/(\d+)$/);
  if (product) return [tags.product(Number(product[1]))];

  return [];
}
