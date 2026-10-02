CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  shop_id     INT          NOT NULL,
  category    TEXT         NOT NULL,
  name        TEXT         NOT NULL,
  description TEXT         NOT NULL,
  price_cents INT          NOT NULL CHECK (price_cents >= 0),
  stock       INT          NOT NULL CHECK (stock >= 0),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX products_shop_id_idx  ON products (shop_id);
CREATE INDEX products_category_idx ON products (category);
