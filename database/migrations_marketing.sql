-- ============================================================
-- ShopZone — "New Product in a Category You've Bought From"
-- Marketing Email Extension
--
-- RUN AFTER: schema.sql, migrations.sql, migrations_supplier.sql,
--            migrations_vector.sql, migrations_marketplace.sql
--
-- Supports n8n-workflows/05_new_product_marketing.json:
--   - tracks which newly-added products have already had their
--     "customers who bought from this category" email batch sent,
--     so a 15-minute poll never double-emails anyone
--   - exposes an RPC that finds, for a given new product, every
--     customer who has a past PAID/non-cancelled order containing a
--     product in the same category, deduplicated to one row per
--     customer with their email pulled from auth.users (which n8n
--     cannot query directly via the REST API, so we surface it
--     through a SECURITY DEFINER function instead)
-- ============================================================

-- ── 1. TRACK WHICH PRODUCTS HAVE HAD THEIR ANNOUNCEMENT SENT ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS marketing_announced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_marketing_announced
  ON products(marketing_announced_at);

-- ── 2. AUDIT TRAIL: who got emailed about what ────────────────
-- Lets you see send history, debug "why did this customer get this
-- email", and cheaply prevent re-sending the same product+customer
-- pair if the workflow is ever re-run manually for the same product.
CREATE TABLE IF NOT EXISTS product_announcement_emails (
  id          SERIAL        PRIMARY KEY,
  product_id  INT           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT          NOT NULL,
  sent_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announce_product ON product_announcement_emails(product_id);
CREATE INDEX IF NOT EXISTS idx_announce_user    ON product_announcement_emails(user_id);

-- ── 3. RPC: NEW PRODUCTS NOT YET ANNOUNCED (called by n8n) ────
CREATE OR REPLACE FUNCTION get_unannounced_products(batch_size INT DEFAULT 20)
RETURNS TABLE (
  product_id    INT,
  product_name  TEXT,
  slug          TEXT,
  description   TEXT,
  price         NUMERIC,
  image_url     TEXT,
  category_id   INT,
  category_name TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.id, p.name, p.slug, p.description, p.price, p.image_url,
         c.id, c.name
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.is_active = TRUE
    AND p.marketing_announced_at IS NULL
  ORDER BY p.created_at
  LIMIT batch_size;
$$;

-- ── 4. RPC: CUSTOMERS WHO PREVIOUSLY BOUGHT FROM THIS CATEGORY ─
-- Returns one row per matching customer (deduplicated), with their
-- email resolved from auth.users — n8n can't read auth.users
-- directly over the REST API, so this function does it server-side
-- under SECURITY DEFINER. Excludes cancelled orders (a cancelled
-- order shouldn't count as "previously bought").
-- Also excludes anyone already announced this exact product, so a
-- manual re-run is always safe.
CREATE OR REPLACE FUNCTION get_category_customers_for_announcement(
  p_category_id INT,
  p_product_id  INT
)
RETURNS TABLE (
  user_id UUID,
  email   TEXT,
  name    TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (u.id)
    u.id,
    u.email::TEXT,
    COALESCE(pr.name, split_part(u.email, '@', 1))::TEXT
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products    p  ON p.id = oi.product_id
  JOIN auth.users  u  ON u.id = o.user_id
  LEFT JOIN profiles pr ON pr.id = u.id
  WHERE p.category_id = p_category_id
    AND o.status != 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM product_announcement_emails pae
      WHERE pae.product_id = p_product_id AND pae.user_id = o.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM orders o2
      JOIN order_items oi2 ON oi2.order_id = o2.id
      WHERE o2.user_id = u.id
        AND oi2.product_id = p_product_id
        AND o2.status != 'cancelled'
    )
  ORDER BY u.id;
END;
$$;

-- ── 5. RPC: MARK PRODUCT AS ANNOUNCED (called by n8n) ──────────
CREATE OR REPLACE FUNCTION mark_product_announced(p_product_id INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products SET marketing_announced_at = NOW() WHERE id = p_product_id;
END;
$$;

-- ── 6. RPC: LOG A SENT ANNOUNCEMENT EMAIL (called by n8n) ──────
CREATE OR REPLACE FUNCTION log_announcement_email(
  p_product_id INT,
  p_user_id    UUID,
  p_email      TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO product_announcement_emails (product_id, user_id, email)
  VALUES (p_product_id, p_user_id, p_email)
  ON CONFLICT (product_id, user_id) DO NOTHING;
END;
$$;

-- ============================================================
-- NOTE ON UNSUBSCRIBE / OPT-OUT
-- This migration does not add a marketing opt-out flag. Before
-- sending real marketing email at any volume, you should add one
-- (e.g. profiles.marketing_opt_out BOOLEAN DEFAULT FALSE) and filter
-- it into get_category_customers_for_announcement(), plus include an
-- unsubscribe link in the email template in the n8n workflow. This
-- is flagged here rather than silently assumed, since marketing
-- email without an opt-out is a compliance problem in most regions
-- (CAN-SPAM, GDPR, India's DPDP Act).
-- ============================================================

-- ============================================================
-- ShopZone — Marketing Email Opt-Out
--
-- RUN AFTER: migrations_marketing.sql
--
-- Adds a consent flag so customers can stop receiving the
-- "new product in a category you've bought from" emails sent by
-- n8n-workflows/05_new_product_marketing.json, plus a public,
-- no-login-required unsubscribe RPC for the link in that email.
-- ============================================================

-- ── 1. OPT-OUT FLAG ────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. FILTER OPTED-OUT CUSTOMERS OUT OF THE ANNOUNCEMENT LIST ─
-- Replaces the version from migrations_marketing.sql with one extra
-- AND clause. Everything else is unchanged.
CREATE OR REPLACE FUNCTION get_category_customers_for_announcement(
  p_category_id INT,
  p_product_id  INT
)
RETURNS TABLE (
  user_id UUID,
  email   TEXT,
  name    TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (u.id)
    u.id,
    u.email::TEXT,
    COALESCE(pr.name, split_part(u.email, '@', 1))::TEXT
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products    p  ON p.id = oi.product_id
  JOIN auth.users  u  ON u.id = o.user_id
  LEFT JOIN profiles pr ON pr.id = u.id
  WHERE p.category_id = p_category_id
    AND o.status != 'cancelled'
    AND COALESCE(pr.marketing_opt_out, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM product_announcement_emails pae
      WHERE pae.product_id = p_product_id AND pae.user_id = o.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM orders o2
      JOIN order_items oi2 ON oi2.order_id = o2.id
      WHERE o2.user_id = u.id
        AND oi2.product_id = p_product_id
        AND o2.status != 'cancelled'
    )
  ORDER BY u.id;
END;
$$;

-- ── 3. PUBLIC UNSUBSCRIBE RPC ──────────────────────────────────
-- Called from the unsubscribe link in the marketing email, which a
-- recipient may click while signed out. Takes a user_id rather than
-- relying on a session, so the link must be its own proof of intent —
-- see the signed-token check in backend/controllers/userController.js
-- (unsubscribeByToken), which verifies an HMAC token BEFORE calling
-- this RPC. This RPC itself is intentionally simple: anyone who can
-- call it can only ever set opt_out = TRUE for a given id, never read
-- or change anything else, so it's safe to expose even though the
-- backend route in front of it is what actually checks the token.
CREATE OR REPLACE FUNCTION unsubscribe_from_marketing(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET marketing_opt_out = TRUE WHERE id = p_user_id;
END;
$$;