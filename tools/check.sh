# usage: tools/check.sh BASE PATH  → cache headers, render time, container, price
out=$(curl -s -m 20 -D - "$1$2")
hdr=$(echo "$out" | tr -d '\r' | grep -iE "^(x-cache|x-nextjs-cache|xkey|x-served-by):" | tr '\n' ' ')
ts=$(echo "$out" | grep -oE "20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z" | head -1)
who=$(echo "$out" | grep -oE "<code>[^<]*</code>" | head -1 | sed -E 's|</?code>||g')
price=$(echo "$out" | grep -oE 'text-3xl font-bold">[^<]*' | head -1 | sed 's/.*">//')
echo "$2 | $hdr| rendered $ts by $who ${price:+| price $price}"
