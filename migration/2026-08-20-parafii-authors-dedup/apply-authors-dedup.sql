-- Merge duplicate parish authors created by the 2026-08-20-parafii-authors
-- import into their pre-existing full-titled counterparts.
--
-- The import's bare-settlement titles ("Якушинці") couldn't trigram-match
-- long existing titles ("Миколаївська церква, с. Якушинці Вінницький повіт
-- Юзвинська волость"), so they were inserted as new. This merge finds them
-- by settlement-word match in the old title, gated by confession
-- compatibility and geo (<2km; or повіт-in-title when the old author has
-- no coords). Merge classes (see README): 'single' = exactly one valid
-- candidate; 'clones' = several candidates that are near-copies of each
-- other (pre-existing dupes) → closest; 'by_dedication' = tie broken by
-- full-title similarity (imp title carries the church dedication).
--
-- For each pair (imp → old): move file_authors/case_authors links, fill
-- old's missing coords, union tags, append imp.info segments the old
-- doesn't already have, delete the imp author.
--
-- Source of truth: merge-list.csv.
-- Run from this directory:  psql "$DB" -f apply-authors-dedup.sql

CREATE TEMP TABLE ml (
  imp_id uuid, imp_title text, old_id uuid, old_title text,
  dist_km numeric, full_sim numeric, cls text
);
\copy ml FROM 'merge-list.csv' CSV HEADER

BEGIN;

-- 1) move links
INSERT INTO file_authors (file_id, author_id)
SELECT fa.file_id, ml.old_id
FROM file_authors fa JOIN ml ON ml.imp_id = fa.author_id
ON CONFLICT DO NOTHING;

DELETE FROM file_authors fa USING ml WHERE fa.author_id = ml.imp_id;

INSERT INTO case_authors (case_id, author_id)
SELECT ca.case_id, ml.old_id
FROM case_authors ca JOIN ml ON ml.imp_id = ca.author_id
ON CONFLICT DO NOTHING;

DELETE FROM case_authors ca USING ml WHERE ca.author_id = ml.imp_id;

-- 2) enrich the kept author: append info segments it doesn't already carry
--    (Повіт: only when the повіт name isn't already in its title/info)
WITH segs AS (
  SELECT ml.old_id, string_agg(s.seg, ' | ' ORDER BY s.ord) AS extra
  FROM ml
  JOIN authors i ON i.id = ml.imp_id
  JOIN authors o ON o.id = ml.old_id
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(i.info, ''), ' \| ')
    WITH ORDINALITY AS s(seg, ord)
  WHERE s.seg <> ''
    AND position(s.seg in coalesce(o.info, '') || ' ' || o.title) = 0
    AND NOT (s.seg LIKE 'Повіт:%' AND position(trim(substring(s.seg from 'Повіт: (.*)$'))
             in o.title || ' ' || coalesce(o.info, '')) > 0)
  GROUP BY ml.old_id
)
UPDATE authors o SET info = concat_ws(' | ', o.info, s.extra)
FROM segs s WHERE o.id = s.old_id;

--    coords fill + tag union
UPDATE authors o SET
  lat = coalesce(o.lat, i.lat),
  lng = coalesce(o.lng, i.lng),
  tags = (SELECT coalesce(array_agg(DISTINCT t), '{}') FROM unnest(o.tags || i.tags) t)
FROM ml JOIN authors i ON i.id = ml.imp_id
WHERE o.id = ml.old_id;

-- 3) delete the merged imports
DELETE FROM authors a USING ml WHERE a.id = ml.imp_id;

-- verification: expect 196 deleted (0 remaining), all old ids still present,
-- and every file link formerly on an imp now present on its old
SELECT
  (SELECT count(*) FROM authors a JOIN ml ON ml.imp_id = a.id) AS imps_remaining,
  (SELECT count(*) FROM ml WHERE NOT EXISTS (SELECT 1 FROM authors o WHERE o.id = ml.old_id)) AS olds_missing,
  (SELECT count(*) FROM file_authors fa JOIN ml ON ml.imp_id = fa.author_id) AS imp_links_remaining;

COMMIT;
