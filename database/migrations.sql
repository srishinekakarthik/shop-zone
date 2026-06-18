-- ============================================================
-- ShopZone Analytics & Feedback Extensions
-- Run in Supabase SQL Editor AFTER the main schema.sql
-- ============================================================

-- ── PRODUCT REVIEWS / CUSTOMER FEEDBACK ─────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id            SERIAL        PRIMARY KEY,
  product_id    INT           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id      INT           REFERENCES orders(id) ON DELETE SET NULL,
  rating        INT           NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  -- Sentiment & Urgency fields populated by n8n workflow (Gemini)
  sentiment       TEXT          CHECK (sentiment IN ('positive','neutral','negative')),
  sentiment_score NUMERIC(4,3),                                  -- -1.0 to 1.0
  sentiment_label TEXT,                                          -- e.g. "Very Positive"
  urgency         TEXT          CHECK (urgency IN ('low','medium','high')),
  urgency_reason  TEXT,                                          -- brief explanation from Gemini
  analyzed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id, order_id)
);

CREATE TRIGGER product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_reviews_product_id  ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment   ON product_reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_reviews_urgency     ON product_reviews(urgency);
CREATE INDEX IF NOT EXISTS idx_reviews_analyzed_at ON product_reviews(analyzed_at);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can read all reviews, only write their own
CREATE POLICY "reviews_public_read"  ON product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"   ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own"   ON product_reviews FOR UPDATE USING (auth.uid() = user_id);

-- ── ANALYTICS SNAPSHOT TABLE (populated by n8n scheduler) ────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id              SERIAL      PRIMARY KEY,
  snapshot_date   DATE        NOT NULL,
  period          TEXT        NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  metrics         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date, period)
);

-- ── ANALYTICS VIEWS ──────────────────────────────────────────

-- Daily order metrics
CREATE OR REPLACE VIEW v_daily_orders AS
SELECT
  DATE(created_at)          AS order_date,
  COUNT(*)                  AS total_orders,
  SUM(total_amount)         AS revenue,
  AVG(total_amount)         AS avg_order_value,
  COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered,
  COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled,
  COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing,
  COUNT(*) FILTER (WHERE status = 'shipped')    AS shipped
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- Top products by revenue (last 30 days)
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  p.id,
  p.name,
  p.image_url,
  c.name            AS category,
  SUM(oi.quantity)  AS units_sold,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products  p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
JOIN orders o ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
  AND o.status != 'cancelled'
GROUP BY p.id, p.name, p.image_url, c.name
ORDER BY revenue DESC
LIMIT 20;

-- Sentiment summary per product
CREATE OR REPLACE VIEW v_sentiment_summary AS
SELECT
  p.id              AS product_id,
  p.name            AS product_name,
  COUNT(r.id)       AS total_reviews,
  AVG(r.rating)     AS avg_rating,
  COUNT(*) FILTER (WHERE r.sentiment = 'positive') AS positive_count,
  COUNT(*) FILTER (WHERE r.sentiment = 'neutral')  AS neutral_count,
  COUNT(*) FILTER (WHERE r.sentiment = 'negative') AS negative_count,
  AVG(r.sentiment_score)                           AS avg_sentiment_score,
  COUNT(*) FILTER (WHERE r.urgency = 'high')       AS urgency_high_count,
  COUNT(*) FILTER (WHERE r.urgency = 'medium')     AS urgency_medium_count,
  COUNT(*) FILTER (WHERE r.urgency = 'low')        AS urgency_low_count
FROM products p
LEFT JOIN product_reviews r ON r.product_id = p.id
WHERE r.analyzed_at IS NOT NULL
GROUP BY p.id, p.name;

-- ── RPC: unanalyzed reviews (called by n8n) ──────────────────
CREATE OR REPLACE FUNCTION get_unanalyzed_reviews(batch_size INT DEFAULT 50)
RETURNS TABLE (
  id         INT,
  product_id INT,
  rating     INT,
  title      TEXT,
  body       TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, product_id, rating, title, body
  FROM product_reviews
  WHERE analyzed_at IS NULL
    AND body IS NOT NULL
    AND body != ''
  ORDER BY created_at
  LIMIT batch_size;
$$;

-- ── RPC: update sentiment + urgency (called by n8n Gemini workflow) ──
CREATE OR REPLACE FUNCTION update_review_sentiment(
  p_review_id       INT,
  p_sentiment       TEXT,
  p_sentiment_score NUMERIC,
  p_sentiment_label TEXT,
  p_urgency         TEXT,
  p_urgency_reason  TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_reviews
  SET
    sentiment       = p_sentiment,
    sentiment_score = p_sentiment_score,
    sentiment_label = p_sentiment_label,
    urgency         = p_urgency,
    urgency_reason  = p_urgency_reason,
    analyzed_at     = NOW()
  WHERE id = p_review_id;
END;
$$;

-- ── SEED: sample reviews for testing ─────────────────────────
-- (Insert only if products exist; adjust product IDs as needed)
-- INSERT INTO product_reviews (product_id, user_id, rating, title, body) VALUES
-- (1, '<your-uuid>', 5, 'Great product!', 'Absolutely loved it, fast delivery and excellent quality.'),
-- (1, '<uuid-2>',   2, 'Disappointed',   'The item arrived broken. Very poor packaging.'),
-- (2, '<uuid-3>',   4, 'Good value',     'Works as described. Would buy again.');
