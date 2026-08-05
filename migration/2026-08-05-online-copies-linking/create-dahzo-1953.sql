\set ON_ERROR_STOP on
SET statement_timeout = '300s';

BEGIN;

-- 1. fond ДАХеО-Р1953  (title/info left NULL, as with Р1920 / Р1924 / Р1943)
INSERT INTO fonds (code, archive_id)
SELECT 'Р1953', a.id FROM archives a WHERE a.code = 'ДАХеО'
ON CONFLICT (code, archive_id) DO NOTHING;

-- 2. inventory Р1953-1
INSERT INTO inventories (code, fond_id)
SELECT '1', fo.id
FROM fonds fo JOIN archives a ON a.id = fo.archive_id
WHERE a.code = 'ДАХеО' AND fo.code = 'Р1953'
ON CONFLICT (code, fond_id) DO NOTHING;

-- 3. one file per distinct code carried in parsed; letter suffixes uppercased
--    to match catalog convention (…-102а  =>  …-102А)
CREATE TEMP TABLE newcodes AS
SELECT DISTINCT
  upper(regexp_replace(
    split_part(regexp_replace(oc.parsed, '^[^(]*\(', ''), '+++', 1),
    '^Р-1953-1-', '')) AS file_code
FROM online_copies oc
WHERE oc.parsed LIKE 'ДАХеО-(Р-1953-1-%';

INSERT INTO files (code, full_code, inventory_id)
SELECT n.file_code, 'ДАХеО-Р1953-1-' || n.file_code, i.id
FROM newcodes n
CROSS JOIN (
  SELECT i.id FROM inventories i
  JOIN fonds fo ON fo.id = i.fond_id
  JOIN archives a ON a.id = fo.archive_id
  WHERE a.code = 'ДАХеО' AND fo.code = 'Р1953' AND i.code = '1'
) i
ON CONFLICT (code, inventory_id) DO NOTHING;

-- 4. link each copy to its file
CREATE TEMP TABLE cand AS
SELECT oc.id AS copy_id, oc.parsed, f.id AS file_id, f.full_code
FROM online_copies oc
JOIN files f
  ON f.full_code = 'ДАХеО-Р1953-1-' || upper(regexp_replace(
       split_part(regexp_replace(oc.parsed, '^[^(]*\(', ''), '+++', 1), '^Р-1953-1-', ''))
WHERE oc.parsed LIKE 'ДАХеО-(Р-1953-1-%'
  AND oc.inventory_id IS NULL AND oc.file_id IS NULL;

DO $$
DECLARE dup int;
BEGIN
  SELECT count(*) INTO dup FROM (SELECT copy_id FROM cand GROUP BY 1 HAVING count(*) > 1) x;
  IF dup > 0 THEN RAISE EXCEPTION 'ambiguous candidates: %', dup; END IF;
END $$;

UPDATE online_copies o
SET file_id = c.file_id, updated_at = now()
FROM cand c
WHERE o.id = c.copy_id;

COMMIT;

\copy (SELECT copy_id, parsed, full_code, file_id FROM cand ORDER BY full_code) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/dahzo-1953-map.csv' CSV HEADER
