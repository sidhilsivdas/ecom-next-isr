# usage: tools/edit.sh BASE ID PRICE  → submits the admin form like a browser without JS
base=$1; id=$2; price=$3
page=$(curl -s "$base/admin/products/$id")
args=()
while IFS= read -r input; do
  name=$(echo "$input" | sed -E 's/.*name="([^"]*)".*/\1/')
  value=$(echo "$input" | grep -oE 'value="[^"]*"' | sed -E 's/^value="(.*)"$/\1/; s/&quot;/"/g')
  args+=(-F "$name=$value")
done < <(echo "$page" | grep -oE '<input[^>]*type="hidden"[^>]*>')
name=$(echo "$page" | grep -oE 'name="name"[^>]*value="[^"]*"' | sed -E 's/.*value="([^"]*)"/\1/')
stock=$(echo "$page" | grep -oE 'name="stock"[^>]*value="[^"]*"' | sed -E 's/.*value="([^"]*)"/\1/')
# Browsers always send Origin on a form POST; Next.js checks it against Host.
curl -s -o /dev/null -w "edit product $id → price $price: HTTP %{http_code}\n" -H "Origin: $base" "${args[@]}" \
  -F "name=$name" -F "description=Edited from the command line" -F "price=$price" -F "stock=$stock" \
  "$base/admin/products/$id"
