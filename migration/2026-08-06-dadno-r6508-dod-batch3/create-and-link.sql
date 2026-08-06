-- ДАДнО-Р6508 «дод.» описи, batch 3 — the remaining 119 unlinked copies
--
-- Pattern variants unified by one regex: `Nдод.-S`, `N.дод-S`, and the
-- newly-seen `N-дод.S` (dash before дод, справа glued after the dot).
-- Every опис number maps to its existing `NДОД` inventory (all 14 exist;
-- resolved by inventory code, no hardcoded ids):
--   1, 5, 7, 13, 14, 20, 23, 24, 25, 26, 27, 28, 29, 30 → NДОД
-- Letter suffixes fold (`32а` → `32А`). Missing files are created (NULL
-- titles, matching the fond's bulk rows).
--
-- Special: 2 copies `Р-6508--27-141` / `--27-29` carry NO «дод» marker →
-- plain опис 27 (file 141 exists ONLY there; both files exist — link only).

BEGIN;

CREATE TEMP TABLE t_parse AS
WITH m AS (
  SELECT id, parsed,
    (regexp_match(parsed, '^ДАДнО-\(Р-6508-([0-9]+)[-.]?дод\.?-?([0-9]+[а-яa-z]?)'))[1] AS num,
    upper(translate(
      (regexp_match(parsed, '^ДАДнО-\(Р-6508-([0-9]+)[-.]?дод\.?-?([0-9]+[а-яa-z]?)'))[2],
      'abcehikmoptxy', 'авсенікмортху')) AS sprava
  FROM online_copies
  WHERE parsed ~ '^ДАДнО-\(Р-6508-[0-9]+[-.]?дод\.?-?[0-9]+'
    AND file_id IS NULL AND inventory_id IS NULL
)
SELECT m.id, m.parsed, m.sprava, i.id AS inventory_id, i.code AS inv_code
FROM m
JOIN inventories i ON i.code = m.num || 'ДОД'
  AND i.fond_id = (SELECT fo.id FROM fonds fo
                   JOIN archives a ON a.id = fo.archive_id
                   WHERE a.code = 'ДАДнО' AND fo.code = 'Р6508')
UNION ALL
SELECT oc.id, oc.parsed,
  (regexp_match(oc.parsed, '^ДАДнО-\(Р-6508--27-([0-9]+)'))[1],
  '735474e7-f4fb-4b27-a223-6b180ff47f26'::uuid, '27'
FROM online_copies oc
WHERE oc.parsed ~ '^ДАДнО-\(Р-6508--27-[0-9]+'
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL;

CREATE TEMP TABLE t_new_files AS
WITH d AS (SELECT DISTINCT inventory_id, inv_code, sprava FROM t_parse),
miss AS (
  SELECT d.* FROM d
  LEFT JOIN files f ON f.inventory_id = d.inventory_id AND f.code = d.sprava
  WHERE f.id IS NULL
), ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT sprava, 'ДАДнО-Р6508-' || inv_code || '-' || sprava, inventory_id, now()
  FROM miss
  RETURNING id, code, inventory_id
)
SELECT * FROM ins;

UPDATE online_copies oc
SET file_id = f.id
FROM t_parse tp, files f
WHERE oc.id = tp.id
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND f.inventory_id = tp.inventory_id AND f.code = tp.sprava;

-- verification: expect 119 parsed, 119 updated, 0 remaining
SELECT count(*) AS parsed_total FROM t_parse;
SELECT count(*) AS new_files FROM t_new_files;
SELECT inv_code, count(*) FROM t_parse GROUP BY inv_code ORDER BY inv_code;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed ILIKE '%Р-6508%' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;

\copy (SELECT id, code, inventory_id FROM t_new_files ORDER BY inventory_id, code) TO 'migration/2026-08-06-dadno-r6508-dod-batch3/created-files.csv' CSV HEADER
\copy (SELECT tp.id AS online_copy_id, oc.file_id, tp.inv_code, tp.sprava, tp.parsed FROM t_parse tp JOIN online_copies oc ON oc.id=tp.id ORDER BY tp.inv_code, tp.sprava) TO 'migration/2026-08-06-dadno-r6508-dod-batch3/linked-copies.csv' CSV HEADER
