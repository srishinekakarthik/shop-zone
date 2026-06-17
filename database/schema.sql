-- ============================================================
-- ShopZone - Supabase / PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ── PROFILES (extends auth.users) ────────────────────────────
-- Supabase Auth manages authentication; this table holds app-level user data.
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT          NOT NULL DEFAULT '',
  role        TEXT          NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL        PRIMARY KEY,
  name        TEXT          NOT NULL UNIQUE,
  slug        TEXT          NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL        PRIMARY KEY,
  category_id  INT           NOT NULL REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  name         TEXT          NOT NULL,
  slug         TEXT          NOT NULL UNIQUE,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  stock        INT           NOT NULL DEFAULT 0,
  image_url    TEXT,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ── CART ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
  id          SERIAL        PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  INT           NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  quantity    INT           NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TRIGGER cart_updated_at
  BEFORE UPDATE ON cart
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ORDERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL        PRIMARY KEY,
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status           TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  total_amount     NUMERIC(10,2) NOT NULL,
  shipping_address JSONB         NOT NULL,
  payment_method   TEXT          NOT NULL DEFAULT 'cod',
  payment_status   TEXT          NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','paid','refunded')),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);

-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL        PRIMARY KEY,
  order_id    INT           NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id  INT           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INT           NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  product_name TEXT         NOT NULL  -- snapshot at purchase time
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cart: users can only see/modify their own cart
CREATE POLICY "cart_select_own" ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cart_insert_own" ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_update_own" ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cart_delete_own" ON cart FOR DELETE USING (auth.uid() = user_id);

-- Orders: users can read their own orders
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);

-- Products & Categories: public read
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read"   ON products   FOR SELECT USING (true);
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);

-- ============================================================
-- RPC HELPER FUNCTIONS (called by backend controllers)
-- ============================================================

-- Increment cart quantity when item already exists (used by addToCart)
CREATE OR REPLACE FUNCTION increment_cart_quantity(
  p_user_id    UUID,
  p_product_id INT,
  p_quantity   INT
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE cart
  SET quantity = quantity + p_quantity
  WHERE user_id = p_user_id AND product_id = p_product_id;
END;
$$;

-- Decrement product stock atomically (used by createOrder)
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id INT,
  p_quantity   INT
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id;
END;
$$;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO categories (name, slug, description) VALUES
  ('Electronics',   'electronics',  'Gadgets and devices'),
  ('Clothing',      'clothing',     'Apparel for all'),
  ('Books',         'books',        'Bestsellers and more'),
  ('Home & Garden', 'home-garden',  'Everything for your home'),
  ('Sports',        'sports',       'Fitness and outdoor gear')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- NOTE: To make a user an admin:
--   UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
-- Or run this after your first signup to make yourself admin:
--   UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
-- ============================================================