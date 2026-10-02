# usage: bash tools/watch.sh  → live feed of cache hits, misses, builds and edits from all containers
#   [cache] HIT      served from Redis, nothing built
#   [cache] MISS     not in Redis yet → will be built
#   [cache] EXPIRED  a tag was expired by an edit → rebuilt now
#   [build]          a page was actually rendered (database queried)
#   [cache] SAVED    the new version was written to Redis
#   [edit]           a shop owner saved a product
#   [cache] TAGS     tags expired by that edit
cd "$(dirname "$0")/.." || exit 1
docker compose logs -f --since 0s web1 web2 web3 2>&1 \
  | grep --line-buffered -E "\[(cache|build|edit)\]" \
  | sed -u -E 's/^(web[0-9])-1 +\| /\1  /'
