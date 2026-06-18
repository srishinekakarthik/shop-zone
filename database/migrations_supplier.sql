-- Run this in the Supabase SQL Editor to add supplier support

ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_email TEXT;

-- Update the RPC to include supplier info
DROP FUNCTION IF EXISTS get_unanalyzed_reviews(integer);

CREATE OR REPLACE FUNCTION get_unanalyzed_reviews(batch_size INT DEFAULT 50)
RETURNS TABLE (
  id             INT,
  product_id     INT,
  rating         INT,
  title          TEXT,
  body           TEXT,
  supplier_name  TEXT,
  supplier_email TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r.id, r.product_id, r.rating, r.title, r.body, p.supplier_name, p.supplier_email
  FROM product_reviews r
  JOIN products p ON p.id = r.product_id
  WHERE r.analyzed_at IS NULL
    AND r.body IS NOT NULL
    AND r.body != ''
  ORDER BY r.created_at
  LIMIT batch_size;
$$;
