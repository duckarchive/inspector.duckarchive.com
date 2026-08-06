-- Trim trailing commas from author.title.
--
-- A plain `UPDATE authors SET title = regexp_replace(title, ',$', '')` fails
-- on authors_title_lat_lng_key whenever trimming a comma-suffixed title makes
-- it collide with an author that already has that exact (title, lat, lng).
-- Batch 1 merges those collisions first (mirroring the app's own author-merge
-- action, mergeAuthorInto() in app/api/editor/actions/[entity]/[id]/data.ts —
-- re-point file_authors/case_authors, union tags, fill blank info, then drop
-- the source row) so batch 2's trim can run unconditionally afterwards.
--
-- Safe to re-run: batch 1's source set shrinks to nothing once merged, and
-- batch 2's WHERE clause only ever matches remaining comma-suffixed titles.
BEGIN;

-- Batch 1: merge every comma-suffixed author into whichever author already
-- holds the trimmed (title, lat, lng). Nulls are treated as matching lat/lng
-- (IS NOT DISTINCT FROM) since two authors named alike with no coordinates
-- are duplicates too, even though the DB constraint itself would tolerate them.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id AS src_id, b.id AS tgt_id
    FROM authors a
    JOIN authors b
      ON b.id <> a.id
     AND b.title = regexp_replace(a.title, ',$', '')
     AND b.lat IS NOT DISTINCT FROM a.lat
     AND b.lng IS NOT DISTINCT FROM a.lng
    WHERE a.title LIKE '%,'
      -- if both sides of a pair have a trailing comma (both would trim to the
      -- same title), merge in one direction only — keep the lower id as target
      AND (b.title NOT LIKE '%,' OR a.id > b.id)
  LOOP
    -- an earlier loop iteration may have already folded this row into another
    -- target (chained duplicates) — skip, nothing left to merge
    IF NOT EXISTS (SELECT 1 FROM authors WHERE id = r.src_id) THEN
      CONTINUE;
    END IF;

    INSERT INTO file_authors (file_id, author_id)
    SELECT file_id, r.tgt_id FROM file_authors WHERE author_id = r.src_id
    ON CONFLICT DO NOTHING;
    DELETE FROM file_authors WHERE author_id = r.src_id;

    INSERT INTO case_authors (case_id, author_id)
    SELECT case_id, r.tgt_id FROM case_authors WHERE author_id = r.src_id
    ON CONFLICT DO NOTHING;
    DELETE FROM case_authors WHERE author_id = r.src_id;

    UPDATE authors t
    SET info = COALESCE(t.info, s.info),
        tags = ARRAY(SELECT DISTINCT unnest(t.tags || s.tags))
    FROM authors s
    WHERE t.id = r.tgt_id AND s.id = r.src_id;

    DELETE FROM authors WHERE id = r.src_id;
  END LOOP;
END $$;

-- Batch 2: trim the rest — no longer collides with anything after batch 1.
UPDATE authors SET title = regexp_replace(title, ',$', '') WHERE title LIKE '%,';

COMMIT;
