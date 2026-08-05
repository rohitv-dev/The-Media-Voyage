BEGIN;

UPDATE user_media
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

UPDATE media_collection
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

UPDATE media
SET metadata = COALESCE(metadata, '{}'::jsonb),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE metadata IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

UPDATE sources
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE created_at IS NULL
   OR updated_at IS NULL;

UPDATE user_media
SET progress = COALESCE(progress, 0),
    favorite = COALESCE(favorite, false),
    visibility = COALESCE(visibility, 'private'::visibility),
    seasons_progress = COALESCE(seasons_progress, '[]'::jsonb),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE progress IS NULL
   OR favorite IS NULL
   OR visibility IS NULL
   OR seasons_progress IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

UPDATE user_media
SET last_progress_update = COALESCE(last_progress_update, updated_at, created_at, now())
WHERE last_progress_update IS NULL;

UPDATE tags
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE created_at IS NULL
   OR updated_at IS NULL;

UPDATE user_media_tags
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

UPDATE media_collection
SET visibility = COALESCE(visibility, 'private'::visibility),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE visibility IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

UPDATE media_collection_items
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

UPDATE friendships
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

UPDATE user_media_reactions
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE created_at IS NULL
   OR updated_at IS NULL;

UPDATE user_media_comments
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE created_at IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM media
    WHERE metadata IS NULL
       OR created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'media invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM sources
    WHERE created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'sources invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_media
    WHERE public_id IS NULL
       OR progress IS NULL
       OR favorite IS NULL
       OR last_progress_update IS NULL
       OR visibility IS NULL
       OR seasons_progress IS NULL
       OR created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user_media invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tags
    WHERE created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'tags invariant backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM user_media_tags WHERE created_at IS NULL) THEN
    RAISE EXCEPTION 'user_media_tags invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM media_collection
    WHERE public_id IS NULL
       OR visibility IS NULL
       OR created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'media_collection invariant backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM media_collection_items WHERE created_at IS NULL) THEN
    RAISE EXCEPTION 'media_collection_items invariant backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM friendships WHERE created_at IS NULL) THEN
    RAISE EXCEPTION 'friendships invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_media_reactions
    WHERE created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user_media_reactions invariant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_media_comments
    WHERE created_at IS NULL
       OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user_media_comments invariant backfill failed';
  END IF;
END $$;

COMMIT;
