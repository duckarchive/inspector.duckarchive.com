-- Rollback for apply-title-info-full.sql: restores files.title / files.info /
-- files.updated_at for all НМІУДСВ files from the pre-state snapshot taken
-- immediately before the apply (pre-state-title-info.csv).
--
-- Run from this directory:  psql "$DB" -f rollback-title-info-full.sql

CREATE TEMP TABLE stg_pre (
  id uuid, title text, info text, updated_at timestamp
);
\copy stg_pre FROM 'pre-state-title-info.csv' CSV HEADER

BEGIN;

UPDATE files f
SET title = p.title, info = p.info, updated_at = p.updated_at
FROM stg_pre p
WHERE f.id = p.id;

-- verification: expect 4813 rows restored; with_title back to 2458, info 0
SELECT
  count(*) AS total_files,
  count(*) FILTER (WHERE f.title IS NOT NULL) AS with_title,
  count(*) FILTER (WHERE f.info IS NOT NULL) AS with_info
FROM files f
JOIN inventories i ON i.id = f.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE a.code = 'НМІУДСВ';

COMMIT;
