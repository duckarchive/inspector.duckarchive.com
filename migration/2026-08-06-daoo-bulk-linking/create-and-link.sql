-- ДАОО bulk online-copy linking (remaining unlinked FamilySearch copies)
-- Archive ДАОО id: f9019ed5-b622-4ff3-b9cf-77482ec168ef
--
-- 4,079 unlinked ДАОО copies at start. This handles 4,056 of them:
--   - фонд_опис_справа triples (incl. Latin-homoglyph letter suffixes,
--     Р_/Р- prefix folding, "-_" OCR glitch)            → file_id
--   - фонд_опис pairs (опис-level scans)                → inventory_id
--   - «л» описи: 5-1-л-148 / 164_1_л_15 → inventory 1Л  → file_id / inventory_id
--   - _чN / ч.N частина suffixes → base справа file (per established rule)
--   - _duplicate suffixes → same file as the original scan
--   - 4-segment F_O_S_part → truncate to first three (ЦДНТА-style rule)
--   - "Ф. 37, on. 2, д. 59-a-2" f-style → 37-2-59А etc.
-- Left manual (23): 8 junk "ДАОО-(---…)", 14 year-parenthesized
-- 1_173/1_174_ч*(YYYY) (справа numbering per year uncertain), 1 "(Rework)".
--
-- Rule precision pre-validated: 22,811 already-linked ДАОО triples map to
-- their file's full_code at 99.9% (rest = the Latin-а homoglyph this
-- script folds). Creates missing catalog rows (NULL titles, like all
-- bulk-imported ДАОО rows): expect 29 fonds, 83 inventories, 3,315 files.

BEGIN;

CREATE TEMP TABLE t_parse AS
WITH raw AS (
  SELECT id, split_part(substring(parsed from '^ДАОО-\((.*)\)$'), '+++', 1) AS seg
  FROM online_copies
  WHERE parsed LIKE 'ДАОО-%' AND file_id IS NULL AND inventory_id IS NULL
), folded AS (
  SELECT id, seg,
    regexp_replace(
      regexp_replace(
        upper(translate(
          regexp_replace(seg, '([_ ]duplicate.*|_ч[0-9]+|[ _]ч\.[0-9]+)$', '', 'i'),
          'ABCEHIKMOPTXYabcehikmoptxy', 'АВСЕНІКМОРТХУАВСЕНІКМОРТХУ')),
        '^Р[-_]', 'Р'),
      '-_', '_') AS norm
  FROM raw
), cls AS (
  SELECT id, seg, norm, regexp_split_to_array(norm, '[-_]') AS p
  FROM folded
  WHERE norm !~ '^Ф' AND norm <> '---' AND norm !~ '\('
), shaped AS (
  SELECT id, seg,
    p[1] AS fond,
    CASE WHEN p[3]='Л' THEN p[2]||'Л' ELSE p[2] END AS inv,
    CASE
      WHEN array_length(p,1)=2 THEN NULL
      WHEN array_length(p,1)=3 AND p[3]='Л' THEN NULL
      WHEN array_length(p,1)=3 THEN p[3]
      WHEN array_length(p,1)=4 AND p[3]='Л' THEN p[4]
      WHEN array_length(p,1)=4 THEN p[3]
    END AS file
  FROM cls
  WHERE (array_length(p,1)=2 AND p[1] ~ '^Р?[0-9]+$' AND p[2] ~ '^[0-9]+$')
     OR (array_length(p,1)=3 AND p[3]='Л')
     OR (array_length(p,1)=3 AND p[1] ~ '^Р?[0-9]+$' AND p[2] ~ '^[0-9]+$' AND p[3] ~ '^[0-9]+[А-ЯІЇЄ]?$')
     OR (array_length(p,1)=4 AND p[3]='Л' AND p[4] ~ '^[0-9]+$')
     OR (array_length(p,1)=4 AND p[3] ~ '^[0-9]+$' AND p[4] ~ '^[0-9]+$')
), fstyle AS (
  SELECT id, seg,
    (regexp_match(seg, 'Ф\.? *([0-9]+)'))[1] AS fond,
    (regexp_match(seg, '[оo][пn]\.? *([0-9]+)'))[1] AS inv,
    (regexp_match(seg, 'д\.? *([0-9]+)'))[1] ||
      CASE WHEN seg ~ 'д\.? *[0-9]+[-_ ][аa]([-_ ]|$)' THEN 'А' ELSE '' END AS file
  FROM raw WHERE seg ~ '^Ф\.'
)
SELECT * FROM shaped UNION ALL SELECT * FROM fstyle;

CREATE TEMP TABLE t_new_fonds AS
WITH d AS (SELECT DISTINCT fond FROM t_parse),
miss AS (
  SELECT d.fond FROM d
  LEFT JOIN fonds fo ON fo.archive_id='f9019ed5-b622-4ff3-b9cf-77482ec168ef' AND fo.code=d.fond
  WHERE fo.id IS NULL
), ins AS (
  INSERT INTO fonds (code, archive_id, updated_at)
  SELECT fond, 'f9019ed5-b622-4ff3-b9cf-77482ec168ef', now() FROM miss
  RETURNING id, code
)
SELECT * FROM ins;

CREATE TEMP TABLE t_new_invs AS
WITH d AS (SELECT DISTINCT fond, inv FROM t_parse),
tgt AS (
  SELECT d.fond, d.inv, fo.id AS fond_id FROM d
  JOIN fonds fo ON fo.archive_id='f9019ed5-b622-4ff3-b9cf-77482ec168ef' AND fo.code=d.fond
), miss AS (
  SELECT tgt.* FROM tgt
  LEFT JOIN inventories i ON i.fond_id=tgt.fond_id AND i.code=tgt.inv
  WHERE i.id IS NULL
), ins AS (
  INSERT INTO inventories (code, fond_id, updated_at)
  SELECT inv, fond_id, now() FROM miss
  RETURNING id, code, fond_id
)
SELECT * FROM ins;

CREATE TEMP TABLE t_new_files AS
WITH d AS (SELECT DISTINCT fond, inv, file FROM t_parse WHERE file IS NOT NULL),
tgt AS (
  SELECT d.fond, d.inv, d.file, i.id AS inventory_id FROM d
  JOIN fonds fo ON fo.archive_id='f9019ed5-b622-4ff3-b9cf-77482ec168ef' AND fo.code=d.fond
  JOIN inventories i ON i.fond_id=fo.id AND i.code=d.inv
), miss AS (
  SELECT tgt.* FROM tgt
  LEFT JOIN files fi ON fi.inventory_id=tgt.inventory_id AND fi.code=tgt.file
  WHERE fi.id IS NULL
), ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT file, 'ДАОО-'||fond||'-'||inv||'-'||file, inventory_id, now() FROM miss
  RETURNING id, code, inventory_id
)
SELECT * FROM ins;

-- link справа-level copies → files
UPDATE online_copies oc
SET file_id = fi.id
FROM t_parse tp, fonds fo, inventories i, files fi
WHERE oc.id = tp.id AND tp.file IS NOT NULL
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND fo.archive_id='f9019ed5-b622-4ff3-b9cf-77482ec168ef' AND fo.code=tp.fond
  AND i.fond_id=fo.id AND i.code=tp.inv
  AND fi.inventory_id=i.id AND fi.code=tp.file;

-- link опис-level copies → inventories
UPDATE online_copies oc
SET inventory_id = i.id
FROM t_parse tp, fonds fo, inventories i
WHERE oc.id = tp.id AND tp.file IS NULL
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND fo.archive_id='f9019ed5-b622-4ff3-b9cf-77482ec168ef' AND fo.code=tp.fond
  AND i.fond_id=fo.id AND i.code=tp.inv;

-- verification: expect 29 / 83 / 3315 created; 3974 + 82 linked; 23 left
SELECT count(*) AS new_fonds FROM t_new_fonds;
SELECT count(*) AS new_invs FROM t_new_invs;
SELECT count(*) AS new_files FROM t_new_files;
SELECT count(*) AS parsed_total,
       count(*) FILTER (WHERE file IS NOT NULL) AS to_files,
       count(*) FILTER (WHERE file IS NULL) AS to_invs
FROM t_parse;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed LIKE 'ДАОО-%' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;

-- audit exports (same session — temp tables still alive; run psql from repo root)
\copy (SELECT id, code FROM t_new_fonds ORDER BY code) TO 'migration/2026-08-06-daoo-bulk-linking/created-fonds.csv' CSV HEADER
\copy (SELECT id, code, fond_id FROM t_new_invs ORDER BY code) TO 'migration/2026-08-06-daoo-bulk-linking/created-invs.csv' CSV HEADER
\copy (SELECT id, code, inventory_id FROM t_new_files ORDER BY inventory_id, code) TO 'migration/2026-08-06-daoo-bulk-linking/created-files.csv' CSV HEADER
\copy (SELECT tp.id AS online_copy_id, tp.seg, tp.fond, tp.inv, tp.file, oc.file_id, oc.inventory_id FROM t_parse tp JOIN online_copies oc ON oc.id=tp.id ORDER BY tp.fond, tp.inv, tp.file) TO 'migration/2026-08-06-daoo-bulk-linking/linked-copies.csv' CSV HEADER
