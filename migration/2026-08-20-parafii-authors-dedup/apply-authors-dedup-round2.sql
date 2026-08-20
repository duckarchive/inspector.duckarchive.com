-- Round 2 of the parish-author dedup: resolve 48 of the 111 cases round 1
-- left in review-ambiguous.csv (several candidate churches in one village).
--
-- Discriminator: **file-link overlap**. Every bare import carries the file
-- link created by 2026-08-20-parafii-file-authors (registry URL → DGS →
-- online_copy → file). When a candidate is already attached to that same
-- file, both describe a parish documented in the same confessional book —
-- decisive evidence they are the same parish. Classes:
--   'shared_file'            (36) — exactly one candidate shares the file;
--   'shared_file+dedication' (12) — several share it, and the import title
--                                   names its own dedication ("Пиків
--                                   (містечко), Свято-Покровська" →
--                                   "Покровська церква, м. Пиків"), which
--                                   picks exactly one.
-- The signal independently reproduced both pairs the user reported
-- (Носківці, Стадниця) without being tuned to them.
--
-- Per pair (imp → old), same as round 1: move file_authors/case_authors,
-- fill old's missing coords, union tags, append info segments the old
-- doesn't already carry, delete the import author.
--
-- Source of truth: merge-list-round2.csv.
-- Run from this directory:  psql "$DB" -f apply-authors-dedup-round2.sql

CREATE TEMP TABLE ml (
  imp_id uuid, imp_title text, old_id uuid, old_title text,
  dist_km numeric, shared_files int, old_files int, cls text
);
\copy ml FROM 'merge-list-round2.csv' CSV HEADER

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

-- 2) enrich the kept author with info segments it doesn't already carry
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

UPDATE authors o SET
  lat = coalesce(o.lat, i.lat),
  lng = coalesce(o.lng, i.lng),
  tags = (SELECT coalesce(array_agg(DISTINCT t), '{}') FROM unnest(o.tags || i.tags) t)
FROM ml JOIN authors i ON i.id = ml.imp_id
WHERE o.id = ml.old_id;

-- 3) delete the merged imports
DELETE FROM authors a USING ml WHERE a.id = ml.imp_id;

-- verification: expect 48 deleted (0 remaining), all kept authors present,
-- no import links left behind
SELECT
  (SELECT count(*) FROM authors a JOIN ml ON ml.imp_id = a.id) AS imps_remaining,
  (SELECT count(*) FROM ml WHERE NOT EXISTS (SELECT 1 FROM authors o WHERE o.id = ml.old_id)) AS olds_missing,
  (SELECT count(*) FROM file_authors fa JOIN ml ON ml.imp_id = fa.author_id) AS imp_links_remaining;

COMMIT;
