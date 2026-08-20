-- Remove the "Реєстр: <url>" segment from authors.info for the 337 authors
-- linked to files by apply-parafii-file-authors.sql — the link now lives in
-- file_authors, so the raw URL in info is redundant. The rest of info
-- (Повіт / Населені пункти / eparchy text) is kept; if nothing remains,
-- info becomes NULL.
--
-- Run from this directory:  psql "$DB" -f cleanup-info-registry.sql
-- Pre-state (for rollback-info-cleanup.sql): pre-state-info.csv

CREATE TEMP TABLE stg_af (
  author_id uuid, author_title text, group_id text, dgs text,
  online_copy_id uuid, file_id uuid, full_code text, file_title text
);
\copy stg_af FROM 'author-file-mapping.csv' CSV HEADER

BEGIN;

UPDATE authors a
SET info = NULLIF(trim(regexp_replace(a.info, '( \| )?Реєстр: https?://\S+', '', 'g')), '')
FROM (SELECT DISTINCT author_id FROM stg_af) s
WHERE a.id = s.author_id;

-- verification: expect 337 in scope, 0 still carrying 'Реєстр:', 0 empty-string
SELECT count(*) AS in_scope,
       count(*) FILTER (WHERE a.info LIKE '%Реєстр:%') AS still_with_registry,
       count(*) FILTER (WHERE a.info = '') AS empty_string,
       count(*) FILTER (WHERE a.info IS NULL) AS now_null
FROM authors a
JOIN (SELECT DISTINCT author_id FROM stg_af) s ON s.author_id = a.id;

COMMIT;
