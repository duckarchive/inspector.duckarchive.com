-- Rollback for apply-parafii-file-authors.sql: removes exactly the
-- file_authors pairs listed in author-file-mapping.csv.
--
-- Run from this directory:  psql "$DB" -f rollback-parafii-file-authors.sql

CREATE TEMP TABLE stg_af (
  author_id uuid, author_title text, group_id text, dgs text,
  online_copy_id uuid, file_id uuid, full_code text, file_title text
);
\copy stg_af FROM 'author-file-mapping.csv' CSV HEADER

BEGIN;

DELETE FROM file_authors fa
USING stg_af s
WHERE fa.file_id = s.file_id AND fa.author_id = s.author_id;

-- verification: expect 0 remaining
SELECT count(*) AS remaining
FROM file_authors fa
JOIN stg_af s ON s.file_id = fa.file_id AND s.author_id = fa.author_id;

COMMIT;
