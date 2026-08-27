-- Preview (READ-ONLY): ЦДІАК ф.128 "Xзаг." FS copies → files ЦДІАК-128-X-N.
-- Fond 128 inventories 1/2/3 are all "Загальні справи"; FS refs cite them as
-- "1заг." / "2заг." / "3заг.". Left behind by 2026-08-25-oc-linking-levels L3
-- because опис "1заг." fails its ^\d{1,4}[letters]$ guard.
-- Sprava normalization (mirrors how the 1,366 already-linked заг copies were
-- linked): "ч.N" part suffix collapses to the base справа, trailing letter is
-- kept uppercased ("87а" → "87А").
-- Writes audit/preview-links.csv; nothing is modified.
-- Run from this folder: psql … -f 01-preview.sql
\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE t_cand AS
SELECT oc.id AS oc_id, oc.url, oc.parsed,
       (regexp_match(oc.parsed, '^ЦДІАК-\(128-(\d+)заг\.-([^+]*)\+\+\+'))[1] AS inv,
       btrim((regexp_match(oc.parsed, '^ЦДІАК-\(128-(\d+)заг\.-([^+]*)\+\+\+'))[2]) AS spr
FROM online_copies oc
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed LIKE 'ЦДІАК-(128-%заг%'
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

CREATE TEMP TABLE t_norm AS
SELECT c.*,
       upper(regexp_replace(regexp_replace(c.spr, '\.?\s*ч\.?\s*\d+$', ''), '\.\d+$', '')) AS spr_norm
FROM t_cand c
WHERE c.inv IS NOT NULL;

-- guard: normalized справа must be digits + up to 2 trailing letters
CREATE TEMP TABLE t_bad AS
SELECT * FROM t_norm
WHERE spr_norm !~ '^\d+[А-ЯІЇЄҐ]{0,2}$' OR length(spr_norm) > 20;

CREATE TEMP TABLE t_map AS
SELECT n.oc_id, n.url, n.parsed, n.inv, n.spr, n.spr_norm,
       i.id AS inventory_id,
       'ЦДІАК-128-' || n.inv || '-' || n.spr_norm AS target_full_code,
       f.id AS file_id
FROM t_norm n
JOIN inventories i
  ON i.code = n.inv
 AND i.fond_id = (SELECT fo.id FROM fonds fo JOIN archives a ON fo.archive_id = a.id
                  WHERE a.code = 'ЦДІАК' AND fo.code = '128')
LEFT JOIN files f ON f.inventory_id = i.id AND f.code = n.spr_norm
WHERE NOT EXISTS (SELECT 1 FROM t_bad b WHERE b.oc_id = n.oc_id);

\copy (SELECT target_full_code, inv, spr AS fs_sprava, spr_norm, CASE WHEN file_id IS NULL THEN 'create+link' ELSE 'link-existing' END AS action, oc_id, url FROM t_map ORDER BY inv, nullif(regexp_replace(spr_norm, '\D', '', 'g'), '')::int, spr_norm, spr) TO 'audit/preview-links.csv' CSV HEADER

SELECT 'candidates' AS what, count(*) FROM t_cand
UNION ALL SELECT 'unparsed (no заг ref)', count(*) FROM t_cand WHERE inv IS NULL
UNION ALL SELECT 'guard-rejected справа', count(*) FROM t_bad
UNION ALL SELECT 'mapped copies', count(*) FROM t_map
UNION ALL SELECT '  → link to existing file', count(*) FROM t_map WHERE file_id IS NOT NULL
UNION ALL SELECT '  → need new file', count(*) FROM t_map WHERE file_id IS NULL
UNION ALL SELECT 'new files to create', count(DISTINCT (inventory_id, spr_norm)) FROM t_map WHERE file_id IS NULL;

SELECT inv, count(*) AS copies, count(file_id) AS existing,
       count(DISTINCT spr_norm) FILTER (WHERE file_id IS NULL) AS new_files
FROM t_map GROUP BY inv ORDER BY inv;

ROLLBACK;
