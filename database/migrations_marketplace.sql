-- ============================================================
-- ShopZone — Vendor Marketplace & Inventory Extension
--
-- RUN ORDER (Supabase SQL Editor), each file once:
--   1. schema.sql
--   2. migrations.sql
--   3. migrations_supplier.sql
--   4. migrations_vector.sql   (after enabling the pgvector extension)
--   5. migrations_marketplace.sql   <-- this file, run last
--
-- Replaces the free-text supplier_name/supplier_email stub from
-- migrations_supplier.sql with a real vendor account model:
-- a supplier signs up, sits in 'pending' until an admin approves
-- them, and can then own and manage their own products.
-- ============================================================

-- ── 1. ADD 'supplier' ROLE ────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'supplier'));

-- Patch the on-signup trigger (originally defined in schema.sql) so it
-- reads `role` and `business_name` out of raw_user_meta_data. The
-- frontend signUp() call passes these in `options.data` for supplier
-- registrations (see SupplierRegisterPage.js). For ordinary customer
-- signups these keys are simply absent and behavior is unchanged.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF v_role NOT IN ('customer', 'supplier') THEN
    v_role := 'customer'; -- never allow self-signup as admin
  END IF;

  INSERT INTO profiles (id, name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'supplier' THEN
    INSERT INTO suppliers (id, business_name, business_email, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business_name', split_part(NEW.email, '@', 1) || '''s Store'),
      NEW.email,
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
-- NOTE: this trigger references the suppliers table, which is created
-- just below in step 2 — that's fine since CREATE OR REPLACE FUNCTION
-- only validates the function body at *call* time in plpgsql, not at
-- creation time. If running statements one-by-one rather than as a
-- whole file, run section 2 first.

-- ── 2. SUPPLIERS TABLE (vendor account + approval state) ──────
CREATE TABLE IF NOT EXISTS suppliers (
  id                UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name     TEXT          NOT NULL,
  business_email    TEXT          NOT NULL,
  phone             TEXT,
  description       TEXT,
  status            TEXT          NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reorder_threshold INT           NOT NULL DEFAULT 5,  -- default low-stock alert level for this vendor's products
  approved_by       UUID          REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  rejected_reason   TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- A supplier can read/update their own row; admins use the service-role
-- key in the backend, which bypasses RLS entirely, so no admin policy needed.
CREATE POLICY "suppliers_select_own" ON suppliers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "suppliers_update_own" ON suppliers FOR UPDATE USING (auth.uid() = id);
-- Insert happens via backend service role during registration, not directly by the client.

-- ── 3. LINK PRODUCTS TO A REAL SUPPLIER ACCOUNT ───────────────
-- migrations_supplier.sql added supplier_name/supplier_email as free text;
-- we keep those as denormalized display fields but ownership now flows
-- through supplier_id.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reorder_threshold INT NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- RLS: suppliers can manage only their own products. Existing
-- "products_public_read" policy (from schema.sql) already lets
-- everyone SELECT active products, so we only add write policies.
CREATE POLICY "products_supplier_insert" ON products
  FOR INSERT WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "products_supplier_update" ON products
  FOR UPDATE USING (auth.uid() = supplier_id);

-- ── 4. RESTOCK ALERTS (written by the n8n restock workflow) ───
CREATE TABLE IF NOT EXISTS restock_alerts (
  id              SERIAL        PRIMARY KEY,
  product_id      INT           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id     UUID          REFERENCES suppliers(id) ON DELETE SET NULL,
  stock_at_alert  INT           NOT NULL,
  threshold       INT           NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'resolved')),
  notified_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_restock_supplier ON restock_alerts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_restock_status   ON restock_alerts(status);

-- Only one OPEN alert per product at a time, so the n8n workflow
-- doesn't spam the same supplier every 15 minutes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_restock_open_per_product
  ON restock_alerts(product_id) WHERE status = 'open';

ALTER TABLE restock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restock_select_own" ON restock_alerts
  FOR SELECT USING (auth.uid() = supplier_id);

-- Auto-resolve an alert once stock rises back above the threshold
-- (e.g. supplier restocks via dashboard or bulk import)
CREATE OR REPLACE FUNCTION auto_resolve_restock_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock > NEW.reorder_threshold THEN
    UPDATE restock_alerts
    SET status = 'resolved', resolved_at = NOW()
    WHERE product_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_resolve_restock ON products;
CREATE TRIGGER trg_auto_resolve_restock
  AFTER UPDATE OF stock ON products
  FOR EACH ROW EXECUTE FUNCTION auto_resolve_restock_alert();

-- ── 5. BULK IMPORT JOBS (audit trail for n8n CSV import) ──────
CREATE TABLE IF NOT EXISTS bulk_import_jobs (
  id              SERIAL        PRIMARY KEY,
  supplier_id     UUID          NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status          TEXT          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_total      INT           NOT NULL DEFAULT 0,
  rows_succeeded  INT           NOT NULL DEFAULT 0,
  rows_failed     INT           NOT NULL DEFAULT 0,
  error_log       JSONB         NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bulk_import_supplier ON bulk_import_jobs(supplier_id);

ALTER TABLE bulk_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_import_select_own" ON bulk_import_jobs
  FOR SELECT USING (auth.uid() = supplier_id);

-- ── 6. COMPLAINT CATEGORY ON REVIEWS (for AI Insights panel) ──
-- Extends sentiment/urgency columns already added in migrations.sql.
-- Populated by the updated n8n sentiment workflow.
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS complaint_category TEXT
    CHECK (complaint_category IN (
      'quality', 'shipping', 'packaging', 'pricing',
      'customer_service', 'sizing_fit', 'not_as_described',
      'missing_parts', 'none'
    ));

CREATE INDEX IF NOT EXISTS idx_reviews_complaint_category ON product_reviews(complaint_category);

-- Update the sentiment RPC to also persist complaint_category
CREATE OR REPLACE FUNCTION update_review_sentiment(
  p_review_id          INT,
  p_sentiment          TEXT,
  p_sentiment_score    NUMERIC,
  p_sentiment_label    TEXT,
  p_urgency            TEXT,
  p_urgency_reason     TEXT,
  p_complaint_category TEXT DEFAULT 'none'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_reviews
  SET
    sentiment           = p_sentiment,
    sentiment_score      = p_sentiment_score,
    sentiment_label      = p_sentiment_label,
    urgency              = p_urgency,
    urgency_reason       = p_urgency_reason,
    complaint_category   = p_complaint_category,
    analyzed_at          = NOW()
  WHERE id = p_review_id;
END;
$$;

-- get_unanalyzed_reviews: extend once more to return supplier_id
-- (needed so per-supplier intelligence/alerts can be scoped correctly)
DROP FUNCTION IF EXISTS get_unanalyzed_reviews(integer);

CREATE OR REPLACE FUNCTION get_unanalyzed_reviews(batch_size INT DEFAULT 50)
RETURNS TABLE (
  id             INT,
  product_id     INT,
  product_name   TEXT,
  rating         INT,
  title          TEXT,
  body           TEXT,
  supplier_id    UUID,
  supplier_name  TEXT,
  supplier_email TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r.id, r.product_id, p.name, r.rating, r.title, r.body,
         p.supplier_id, p.supplier_name, p.supplier_email
  FROM product_reviews r
  JOIN products p ON p.id = r.product_id
  WHERE r.analyzed_at IS NULL
    AND r.body IS NOT NULL
    AND r.body != ''
  ORDER BY r.created_at
  LIMIT batch_size;
$$;

-- ── 7. RPC: LOW STOCK CHECK (called by n8n restock workflow) ──
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  product_id          INT,
  product_name        TEXT,
  stock               INT,
  reorder_threshold   INT,
  supplier_id         UUID,
  business_name       TEXT,
  business_email      TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.id, p.name, p.stock, p.reorder_threshold,
         s.id, s.business_name, s.business_email
  FROM products p
  JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = TRUE
    AND s.status = 'approved'
    AND p.stock <= p.reorder_threshold
    AND NOT EXISTS (
      SELECT 1 FROM restock_alerts ra
      WHERE ra.product_id = p.id AND ra.status = 'open'
    );
$$;

-- ── 8. RPC: CREATE RESTOCK ALERT (called by n8n) ───────────────
CREATE OR REPLACE FUNCTION create_restock_alert(
  p_product_id     INT,
  p_supplier_id    UUID,
  p_stock_at_alert INT,
  p_threshold      INT
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  INSERT INTO restock_alerts (product_id, supplier_id, stock_at_alert, threshold)
  VALUES (p_product_id, p_supplier_id, p_stock_at_alert, p_threshold)
  ON CONFLICT (product_id) WHERE status = 'open' DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 9. RPC: BULK INSERT PRODUCTS (called by n8n bulk import) ──
-- Accepts a JSON array of product rows and inserts them all under
-- the given supplier. Returns counts so n8n can update the job row.
CREATE OR REPLACE FUNCTION bulk_insert_products(
  p_supplier_id UUID,
  p_products    JSONB
)
RETURNS TABLE (succeeded INT, failed INT, errors JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row         JSONB;
  v_succeeded   INT := 0;
  v_failed      INT := 0;
  v_errors      JSONB := '[]'::JSONB;
  v_category_id INT;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      SELECT id INTO v_category_id FROM categories
      WHERE slug = (v_row->>'category_slug') LIMIT 1;

      INSERT INTO products (
        name, slug, description, price, stock, category_id, image_url,
        supplier_id, supplier_name, reorder_threshold, is_active
      ) VALUES (
        v_row->>'name',
        lower(regexp_replace(v_row->>'name', '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random()*10000)::text,
        v_row->>'description',
        (v_row->>'price')::NUMERIC,
        COALESCE((v_row->>'stock')::INT, 0),
        v_category_id,
        v_row->>'image_url',
        p_supplier_id,
        (SELECT business_name FROM suppliers WHERE id = p_supplier_id),
        COALESCE((v_row->>'reorder_threshold')::INT, 5),
        TRUE
      );
      v_succeeded := v_succeeded + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object('row', v_row, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT v_succeeded, v_failed, v_errors;
END;
$$;

-- ── 10. SUPPLIER-SCOPED VIEWS ───────────────────────────────────
CREATE OR REPLACE VIEW v_supplier_sentiment_summary AS
SELECT
  p.supplier_id,
  p.id              AS product_id,
  p.name            AS product_name,
  COUNT(r.id)       AS total_reviews,
  AVG(r.rating)     AS avg_rating,
  COUNT(*) FILTER (WHERE r.sentiment = 'positive') AS positive_count,
  COUNT(*) FILTER (WHERE r.sentiment = 'neutral')  AS neutral_count,
  COUNT(*) FILTER (WHERE r.sentiment = 'negative') AS negative_count,
  AVG(r.sentiment_score)                           AS avg_sentiment_score,
  COUNT(*) FILTER (WHERE r.urgency = 'high')       AS urgency_high_count,
  COUNT(*) FILTER (WHERE r.urgency = 'medium')     AS urgency_medium_count
FROM products p
LEFT JOIN product_reviews r ON r.product_id = p.id AND r.analyzed_at IS NOT NULL
WHERE p.supplier_id IS NOT NULL
GROUP BY p.supplier_id, p.id, p.name;

CREATE OR REPLACE VIEW v_supplier_order_items AS
SELECT
  p.supplier_id,
  oi.id            AS order_item_id,
  oi.order_id,
  o.status         AS order_status,
  o.created_at     AS order_date,
  oi.product_id,
  oi.product_name,
  oi.quantity,
  oi.unit_price,
  (oi.quantity * oi.unit_price) AS line_total
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders   o ON o.id = oi.order_id
WHERE p.supplier_id IS NOT NULL;

-- ── 11. PLATFORM-WIDE INTELLIGENCE VIEWS (admin AI Insights) ──
CREATE OR REPLACE VIEW v_complaint_categories AS
SELECT complaint_category, COUNT(*) AS total
FROM product_reviews
WHERE analyzed_at IS NOT NULL
  AND sentiment = 'negative'
  AND complaint_category IS NOT NULL
  AND complaint_category != 'none'
GROUP BY complaint_category
ORDER BY total DESC;

CREATE OR REPLACE VIEW v_risk_products AS
SELECT
  p.id           AS product_id,
  p.name         AS product_name,
  p.supplier_id,
  s.business_name AS supplier_name,
  COUNT(*) FILTER (WHERE r.sentiment = 'negative') AS negative_count,
  COUNT(*) FILTER (WHERE r.urgency = 'high')       AS high_urgency_count,
  AVG(r.sentiment_score)                           AS avg_sentiment_score,
  COUNT(*)                                         AS total_reviews
FROM products p
JOIN product_reviews r ON r.product_id = p.id AND r.analyzed_at IS NOT NULL
LEFT JOIN suppliers s ON s.id = p.supplier_id
GROUP BY p.id, p.name, p.supplier_id, s.business_name
HAVING COUNT(*) FILTER (WHERE r.sentiment = 'negative') >= 1
ORDER BY negative_count DESC, high_urgency_count DESC
LIMIT 10;

-- ── 12. PLATFORM BUSINESS OVERVIEW HELPER (admin dashboard) ───
CREATE OR REPLACE VIEW v_supplier_counts AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending')  AS pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*)                                    AS total_count
FROM suppliers;

-- ============================================================
-- NOTES
--
-- Supplier signup flow (handled by backend, see authController.js):
--   1. POST /api/auth/register/supplier creates an auth.users row,
--      a profiles row with role='supplier', and a suppliers row
--      with status='pending'.
--   2. The supplier cannot add/manage products or view the supplier
--      dashboard until an admin calls
--      PATCH /api/admin/suppliers/:id/approve
--   3. RLS on products (products_supplier_insert/update) only
--      checks auth.uid() = supplier_id — approval gating itself
--      is enforced in the backend middleware (supplierApprovedOnly),
--      since RLS can't easily check a joined table's status. The
--      backend is the source of truth for "can this supplier act yet".
-- ============================================================
