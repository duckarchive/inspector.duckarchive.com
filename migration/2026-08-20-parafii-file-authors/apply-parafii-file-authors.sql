-- Link parish authors (2026-08-20-parafii-authors batch) to files via DGS.
--
-- Chain: author.info "Реєстр: <FamilySearch ark URL>" → groupId param
-- (film-level APID) → DGS via GET das/v2/apid:<groupId>/name?namespace=dgs
-- (scripts/to-dgs.ts logic; 24 unique films) → online_copies.url
-- imageGroupNumbers=<DGS> (padding-insensitive numeric match) → file_id.
--
-- Scope: the 337 authors whose registry URL is a FamilySearch ark link.
-- All 24 DGS matched exactly one linked online_copy each. 15 files are
-- per-parish books (1 author), the повіт-wide confessional books get up to
-- 63 parish authors — semantically correct many-to-many. Other registry
-- hosts (daro-metric-map: separate project per user, lubgens, google docs,
-- cdiak) are out of scope here.
--
-- Source of truth: author-file-mapping.csv (verified pairs, 0 pre-existing).
-- Run from this directory:  psql "$DB" -f apply-parafii-file-authors.sql

CREATE TEMP TABLE stg_af (
  author_id uuid, author_title text, group_id text, dgs text,
  online_copy_id uuid, file_id uuid, full_code text, file_title text
);
\copy stg_af FROM 'author-file-mapping.csv' CSV HEADER

BEGIN;

INSERT INTO file_authors (file_id, author_id)
SELECT DISTINCT file_id, author_id FROM stg_af
ON CONFLICT DO NOTHING;

-- verification: expect 337 pairs present, 337 distinct authors, 24 files
SELECT count(*) AS linked_pairs,
       count(DISTINCT fa.author_id) AS authors,
       count(DISTINCT fa.file_id) AS files
FROM file_authors fa
JOIN stg_af s ON s.file_id = fa.file_id AND s.author_id = fa.author_id;

COMMIT;
