BEGIN;

ALTER TABLE media
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(
    to_tsvector('simple'::regconfig, coalesce("title", '')),
    'A'
  ) ||
  setweight(
    to_tsvector(
      'simple'::regconfig,
      coalesce("metadata"->>'genre', '') ||
      ' ' ||
      coalesce("metadata"->>'keywords', '') ||
      ' ' ||
      coalesce("metadata"->>'themes', '') ||
      ' ' ||
      coalesce("metadata"->>'gameModes', '') ||
      ' ' ||
      coalesce("metadata"->>'playerPerspectives', '') ||
      ' ' ||
      coalesce("metadata"->>'subjects', '')
    ),
    'B'
  ) ||
  setweight(
    to_tsvector('simple'::regconfig, coalesce("description", '')),
    'C'
  )
) STORED;

CREATE INDEX IF NOT EXISTS media_search_vector_idx
ON media USING gin (search_vector);

COMMIT;
