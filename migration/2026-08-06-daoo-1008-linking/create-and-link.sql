-- ДАОО fond 1008 online-copy linking
--
-- 11 unlinked FamilySearch online_copies parse as ДАОО-(1008_1[_N]):
-- fond 1008, опис 1, справи 1–10, plus one bare "1008_1" copy (the опис
-- itself). Fond 1008 did not exist in ДАОО at all, so this creates the
-- full chain: fond → inventory → 10 files (all with NULL titles, matching
-- prior bulk-created catalog rows), then links:
--   - the 10 "1008_1_N" copies → files (file_id)
--   - the bare "1008_1" copy   → inventory (inventory_id)
--
-- ДАОО archive id: f9019ed5-b622-4ff3-b9cf-77482ec168ef
-- full_code convention (existing ДАОО rows): ДАОО-<fond>-<опис>-<справа>

BEGIN;

CREATE TEMP TABLE tmp_fond AS
WITH ins AS (
  INSERT INTO fonds (code, archive_id, updated_at)
  VALUES ('1008', 'f9019ed5-b622-4ff3-b9cf-77482ec168ef', now())
  RETURNING id
)
SELECT id FROM ins;

CREATE TEMP TABLE tmp_inv AS
WITH ins AS (
  INSERT INTO inventories (code, fond_id, updated_at)
  SELECT '1', id, now() FROM tmp_fond
  RETURNING id
)
SELECT id FROM ins;

CREATE TEMP TABLE tmp_new_files AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT n::text, 'ДАОО-1008-1-' || n, (SELECT id FROM tmp_inv), now()
  FROM generate_series(1, 10) AS n
  RETURNING id, code
)
SELECT * FROM ins;

SELECT (SELECT id FROM tmp_fond) AS fond_id, (SELECT id FROM tmp_inv) AS inventory_id;
SELECT * FROM tmp_new_files ORDER BY code::int;

-- справа copies → files
UPDATE online_copies oc
SET file_id = f.id
FROM tmp_new_files f
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed ~ '^ДАОО-\(1008_1_'
  AND (regexp_match(oc.parsed, '^ДАОО-\(1008_1_([0-9]+)\+'))[1] = f.code;

-- bare опис copy → inventory
UPDATE online_copies oc
SET inventory_id = (SELECT id FROM tmp_inv)
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed = 'ДАОО-(1008_1+++1008_1+++1008_1)';

-- verification: expect 10 new files, 0 remaining unlinked in this family
SELECT count(*) AS new_files FROM tmp_new_files;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed ~ '^ДАОО-\(1008_1' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;
