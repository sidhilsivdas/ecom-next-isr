-- 50,000 products spread over 200 shops and 8 categories.
INSERT INTO products (shop_id, category, name, description, price_cents, stock)
SELECT
  1 + (g % 200),
  c.category,
  initcap(adj.word || ' ' || c.item) || ' #' || g,
  'A ' || adj.word || ' ' || c.item || ' sold by shop ' || (1 + (g % 200))
    || '. Product number ' || g || ' in the ' || c.category || ' category.',
  499 + floor(random() * 20000)::int,
  floor(random() * 100)::int
FROM generate_series(1, 50000) AS g
CROSS JOIN LATERAL (
  SELECT (ARRAY['shoes','shirts','bags','watches','phones','books','toys','kitchen'])[1 + g % 8] AS category,
         (ARRAY['sneaker','shirt','backpack','watch','phone','novel','robot','kettle'])[1 + g % 8]  AS item
) AS c
CROSS JOIN LATERAL (
  SELECT (ARRAY['red','blue','classic','smart','eco','pro','mini','ultra','vintage','urban'])[1 + (g * 7) % 10] AS word
) AS adj;
