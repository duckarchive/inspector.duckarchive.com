-- Rollback for apply-parafii-authors.sql: restores the authors table to the
-- pre-state-authors.csv snapshot (taken 2026-08-20 immediately before apply).
--
-- CAUTION: deletes ALL authors created after the snapshot (the 1,028 parish
-- inserts have no file/case links, so this is safe if run promptly; any
-- author legitimately created in the app after the snapshot would be lost).
--
-- Run from this directory:  psql "$DB" -f rollback-parafii-authors.sql

CREATE TEMP TABLE pre (
  id uuid, title text, info text, lat float8, lng float8, tags text[]
);
\copy pre FROM 'pre-state-authors.csv' CSV HEADER

BEGIN;

DELETE FROM authors a
WHERE NOT EXISTS (SELECT 1 FROM pre p WHERE p.id = a.id);

UPDATE authors a
SET title = p.title, info = p.info, lat = p.lat, lng = p.lng, tags = p.tags
FROM pre p
WHERE p.id = a.id
  AND (a.title, a.info, a.lat, a.lng, a.tags)
      IS DISTINCT FROM (p.title, p.info, p.lat, p.lng, p.tags);

-- verification: expect 16187 total, 0 with registry marker
SELECT count(*) AS total,
       count(*) FILTER (WHERE info LIKE '%Реєстр:%') AS with_registry
FROM authors;

COMMIT;
