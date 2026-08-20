-- Rollback for apply-authors-dedup.sql: re-creates the 196 merged import
-- authors, restores the kept authors' columns, and restores the exact
-- pre-merge file_authors/case_authors rows for every involved author.
--
-- Run from this directory:  psql "$DB" -f rollback-authors-dedup.sql

CREATE TEMP TABLE pre_imp (id uuid, title text, info text, lat float8, lng float8, tags text[]);
\copy pre_imp FROM 'pre-state-imp-authors.csv' CSV HEADER
CREATE TEMP TABLE pre_old (id uuid, title text, info text, lat float8, lng float8, tags text[]);
\copy pre_old FROM 'pre-state-old-authors.csv' CSV HEADER
CREATE TEMP TABLE pre_fa (file_id uuid, author_id uuid);
\copy pre_fa FROM 'pre-state-file-authors.csv' CSV HEADER
CREATE TEMP TABLE pre_ca (case_id uuid, author_id uuid);
\copy pre_ca FROM 'pre-state-case-authors.csv' CSV HEADER

BEGIN;

-- re-create merged import authors
INSERT INTO authors (id, title, info, lat, lng, tags)
SELECT id, title, info, lat, lng, tags FROM pre_imp
ON CONFLICT (id) DO NOTHING;

-- restore kept authors' columns
UPDATE authors a SET title = p.title, info = p.info, lat = p.lat, lng = p.lng, tags = p.tags
FROM pre_old p WHERE a.id = p.id;

-- restore link tables to the exact pre-merge state for involved authors
DELETE FROM file_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old);
INSERT INTO file_authors (file_id, author_id) SELECT file_id, author_id FROM pre_fa;

DELETE FROM case_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old);
INSERT INTO case_authors (case_id, author_id) SELECT case_id, author_id FROM pre_ca;

-- verification: expect 196 imports back, file link count = snapshot count
SELECT
  (SELECT count(*) FROM authors a JOIN pre_imp p ON p.id = a.id) AS imps_restored,
  (SELECT count(*) FROM file_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old)) AS fa_rows,
  (SELECT count(*) FROM pre_fa) AS fa_expected;

COMMIT;
