# usage: tools/check.sh BASE PATH  → cache headers at each layer, render time, container, price
out=$(curl -s -m 20 -D - "$1$2")
hdr=$(echo "$out" | tr -d '\r' | grep -iE "^(x-cache|x-nextjs-cache|xkey|x-served-by):" | tr '\n' ' ')
ts=$(echo "$out" | grep -oE 'data-rendered-at="[^"]*"' | head -1 | cut -d'"' -f2)
who=$(echo "$out" | grep -oE 'data-rendered-by="[^"]*"' | head -1 | cut -d'"' -f2)
cents=$(echo "$out" | grep -oE 'data-price="[0-9]+"' | head -1 | grep -oE '[0-9]+')
price=${cents:+\$$((cents / 100)).$(printf '%02d' $((cents % 100)))}
echo "$2 | $hdr| rendered $ts by $who ${price:+| price $price}"
