-- ============================================================
-- ShopZone Vector Store Setup (Gemini text-embedding-004)
-- Run AFTER enabling pgvector extension in Supabase:
--   Dashboard → Extensions → pgvector → Enable
--
-- NOTE: Gemini text-embedding-004 produces 768-dim vectors
-- (OpenAI text-embedding-3-small used 1536-dim).
-- If you previously ran this with OpenAI, DROP and recreate:
--   DROP TABLE IF EXISTS documents;
-- then re-run this file and re-ingest.
-- ============================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Documents table (LangChain SupabaseVectorStore format) ───
CREATE TABLE IF NOT EXISTS documents (
  id         BIGSERIAL    PRIMARY KEY,
  content    TEXT,                          -- chunk text
  metadata   JSONB        DEFAULT '{}',     -- type, product_id, etc.
  embedding  VECTOR(768)                    -- Gemini text-embedding-004 dim
);

-- IVFFlat index for fast approximate nearest-neighbour search
-- Tune lists = sqrt(row_count) after inserting data
CREATE INDEX IF NOT EXISTS idx_documents_embedding
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── Match function (called by LangChain retriever) ───────────
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count     INT     DEFAULT 4,
  filter          JSONB   DEFAULT '{}'
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE d.metadata @> filter
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Optional: allow authenticated users to query (chatbot reads openly)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_public_read" ON documents FOR SELECT USING (true);
