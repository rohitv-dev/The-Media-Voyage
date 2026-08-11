BEGIN;

ALTER TABLE media
ADD COLUMN IF NOT EXISTS embedding_model text;

-- Embeddings are derived data. Reset them while changing dimensions so no
-- OpenAI 1536-dimensional vector can survive this migration.
ALTER TABLE media
ALTER COLUMN embedding TYPE vector(384)
USING NULL::vector(384);

UPDATE media
SET embedding_updated_at = NULL,
    embedding_model = NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM media WHERE embedding IS NOT NULL) THEN
    RAISE EXCEPTION 'media embedding migration left non-null vectors';
  END IF;
END $$;

COMMIT;
