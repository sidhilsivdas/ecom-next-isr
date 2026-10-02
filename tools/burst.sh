# usage: tools/burst.sh PATH [COUNT] [BASE]  → COUNT concurrent requests, then renders per container
#   BASE http://localhost:8088 (default) goes through the CDN; http://localhost:8080 skips it
path=${1:-/products/12345}; count=${2:-300}; base=${3:-http://localhost:8088}
cd "$(dirname "$0")/.." || exit 1
start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "responses:"
seq "$count" | xargs -P 100 -I{} curl -s -o /dev/null -w "%{http_code}\n" "$base$path" | sort | uniq -c
echo "renders per container:"
docker compose logs --since "$start" web1 web2 web3 2>&1 | grep "\[build\]  $path rendered" | cut -d' ' -f1 | sort | uniq -c
