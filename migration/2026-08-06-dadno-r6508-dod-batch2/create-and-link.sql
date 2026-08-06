-- ДАДнО-Р6508 «дод.» описи, batch 2 — nine user-specified inventory targets
--
--   8дод.      → 81c71a83-0317-41ec-af54-f755e4b4315d (8ДОД)
--   30.дод     → b843aada-e248-4e5c-b0b0-63456b222f0f (30ДОД)
--   10дод.     → 34f393f9-031b-4981-84b7-1624ddb3375d (10ДОД)
--   10дод.№2   → 68f06e90-0f74-4dab-b847-a4730f467ffc (10ДОД2)
--   29дод.     → 941ce28c-e97a-4ee1-9df6-d45a81e18007 (29ДОД)
--   27дод.     → d33dab2a-6c71-45b8-9fdf-8b727e486cdd (27ДОД)
--   19дод.     → 4621fd5f-7008-4cb0-b8fe-1ad22c04990c (19ДОД)
--   25дод.     → 90374df3-7c3e-4736-b060-972bc8233365 (25ДОД)
--   22дод.     → 24414a0d-2ba4-441d-949c-80378272ed4c (22ДОД)
--
-- Punctuation variants (Nдод. / N.дод / Nдод) are folded per опис number;
-- 10дод.№2 is matched separately from 10дод. Mapping pre-validated: every
-- already-linked sibling copy of each variant points at exactly its target
-- inventory above. 138 unlinked copies in scope; missing files are created
-- (code + full_code, NULL titles, matching the fond's bulk-imported rows).

BEGIN;

CREATE TEMP TABLE t_map (grp text PRIMARY KEY, inventory_id uuid);
INSERT INTO t_map VALUES
  ('8',    '81c71a83-0317-41ec-af54-f755e4b4315d'),
  ('30',   'b843aada-e248-4e5c-b0b0-63456b222f0f'),
  ('10',   '34f393f9-031b-4981-84b7-1624ddb3375d'),
  ('10№2', '68f06e90-0f74-4dab-b847-a4730f467ffc'),
  ('29',   '941ce28c-e97a-4ee1-9df6-d45a81e18007'),
  ('27',   'd33dab2a-6c71-45b8-9fdf-8b727e486cdd'),
  ('19',   '4621fd5f-7008-4cb0-b8fe-1ad22c04990c'),
  ('25',   '90374df3-7c3e-4736-b060-972bc8233365'),
  ('22',   '24414a0d-2ba4-441d-949c-80378272ed4c');

CREATE TEMP TABLE t_parse AS
WITH m AS (
  SELECT id, parsed,
    (regexp_match(parsed, '^ДАДнО-\(Р-6508-([0-9]+)\.?дод\.?(№2)?-([0-9]+[а-яa-z]?)'))[1] AS num,
    (regexp_match(parsed, '^ДАДнО-\(Р-6508-([0-9]+)\.?дод\.?(№2)?-([0-9]+[а-яa-z]?)'))[2] AS n2,
    upper(translate(
      (regexp_match(parsed, '^ДАДнО-\(Р-6508-([0-9]+)\.?дод\.?(№2)?-([0-9]+[а-яa-z]?)'))[3],
      'abcehikmoptxy', 'авсенікмортху')) AS sprava
  FROM online_copies
  WHERE parsed ~ '^ДАДнО-\(Р-6508-(8|30|10|29|27|19|25|22)\.?дод'
    AND file_id IS NULL AND inventory_id IS NULL
)
SELECT m.id, m.parsed, m.sprava, t.inventory_id
FROM m JOIN t_map t ON t.grp = m.num || coalesce(m.n2, '');

CREATE TEMP TABLE t_new_files AS
WITH d AS (SELECT DISTINCT inventory_id, sprava FROM t_parse),
miss AS (
  SELECT d.* FROM d
  LEFT JOIN files f ON f.inventory_id = d.inventory_id AND f.code = d.sprava
  WHERE f.id IS NULL
), ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT m.sprava,
         'ДАДнО-Р6508-' || i.code || '-' || m.sprava,
         m.inventory_id, now()
  FROM miss m JOIN inventories i ON i.id = m.inventory_id
  RETURNING id, code, inventory_id
)
SELECT * FROM ins;

UPDATE online_copies oc
SET file_id = f.id
FROM t_parse tp, files f
WHERE oc.id = tp.id
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND f.inventory_id = tp.inventory_id AND f.code = tp.sprava;

-- verification: expect 138 parsed, 138 updated, 0 remaining in scope
SELECT count(*) AS parsed_total FROM t_parse;
SELECT count(*) AS new_files FROM t_new_files;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed ~ '^ДАДнО-\(Р-6508-(8|30|10|29|27|19|25|22)\.?дод'
  AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;

\copy (SELECT id, code, inventory_id FROM t_new_files ORDER BY inventory_id, code) TO 'migration/2026-08-06-dadno-r6508-dod-batch2/created-files.csv' CSV HEADER
\copy (SELECT tp.id AS online_copy_id, oc.file_id, tp.inventory_id AS target_inventory, tp.sprava, tp.parsed FROM t_parse tp JOIN online_copies oc ON oc.id=tp.id ORDER BY tp.inventory_id, tp.sprava) TO 'migration/2026-08-06-dadno-r6508-dod-batch2/linked-copies.csv' CSV HEADER
