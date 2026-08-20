-- Rollback for apply-authors-dedup-round2.sql: re-creates the 48 merged
-- import authors, restores the kept authors' columns, and restores the
-- exact pre-merge link rows for every involved author.
--
-- Run from this directory:  psql "$DB" -f rollback-authors-dedup-round2.sql

CREATE TEMP TABLE pre_imp (id uuid, title text, info text, lat float8, lng float8, tags text[]);
\copy pre_imp FROM 'pre-state-imp-authors-round2.csv' CSV HEADER
CREATE TEMP TABLE pre_old (id uuid, title text, info text, lat float8, lng float8, tags text[]);
\copy pre_old FROM 'pre-state-old-authors-round2.csv' CSV HEADER
CREATE TEMP TABLE pre_fa (file_id uuid, author_id uuid);
\copy pre_fa FROM 'pre-state-file-authors-round2.csv' CSV HEADER
CREATE TEMP TABLE pre_ca (case_id uuid, author_id uuid);
\copy pre_ca FROM 'pre-state-case-authors-round2.csv' CSV HEADER

BEGIN;

INSERT INTO authors (id, title, info, lat, lng, tags)
SELECT id, title, info, lat, lng, tags FROM pre_imp
ON CONFLICT (id) DO NOTHING;

UPDATE authors a SET title = p.title, info = p.info, lat = p.lat, lng = p.lng, tags = p.tags
FROM pre_old p WHERE a.id = p.id;

DELETE FROM file_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old);
INSERT INTO file_authors (file_id, author_id) SELECT file_id, author_id FROM pre_fa;

DELETE FROM case_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old);
INSERT INTO case_authors (case_id, author_id) SELECT case_id, author_id FROM pre_ca;

-- verification: expect 48 imports back, link counts equal to the snapshots
SELECT
  (SELECT count(*) FROM authors a JOIN pre_imp p ON p.id = a.id) AS imps_restored,
  (SELECT count(*) FROM file_authors WHERE author_id IN (SELECT id FROM pre_imp UNION SELECT id FROM pre_old)) AS fa_rows,
  (SELECT count(*) FROM pre_fa) AS fa_expected;

COMMIT;
