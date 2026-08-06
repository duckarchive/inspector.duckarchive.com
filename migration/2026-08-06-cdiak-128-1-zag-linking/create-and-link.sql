-- ЦДІАК-128-1заг. online-copy linking
-- Target inventory: ЦДІАК-128-1 "Загальні справи" (id 6e8cf222-b07f-48f8-9bc5-26e288e2091f)
--
-- 514/607 online_copies matching parsed ILIKE '%ЦДІАК%128%1заг%' are already
-- correctly linked to files in this inventory. The remaining 93 reference
-- "N ч.M" (частина/part) справи that were never catalogued as files here —
-- 25 distinct base справа numbers (27, 30, 88, 213, 223, 250, 287, 305, 306,
-- 344, 346, 366, 380, 401, 406, 412, 430, 441, 444, 451, 480, 483, 546, 588, 689).
--
-- Convention (matches existing DB precedent, e.g. "10052А" <- ч.2, "117" <- ч.1):
-- a multi-part справа is ONE catalog file; all "ч.N" online copies for the
-- same base number link to the same file.
--
-- This creates those 25 missing files (code + full_code only, matching how
-- this inventory's other 514 files were bulk-imported with NULL
-- title/info/tags) and links all 93 online copies to them.

BEGIN;

CREATE TEMP TABLE tmp_new_files AS
WITH bases AS (
  SELECT DISTINCT (regexp_match(parsed, '128-1заг\.-([0-9]+)ч\.[0-9]+'))[1] AS code
  FROM online_copies
  WHERE parsed ILIKE '%ЦДІАК%128%1заг%'
    AND file_id IS NULL
    AND inventory_id IS NULL
), inserted AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT code, 'ЦДІАК-128-1-' || code, '6e8cf222-b07f-48f8-9bc5-26e288e2091f', now()
  FROM bases
  RETURNING id, code
)
SELECT * FROM inserted;

SELECT * FROM tmp_new_files ORDER BY code::int;

UPDATE online_copies oc
SET file_id = f.id
FROM tmp_new_files f
WHERE oc.parsed ILIKE '%ЦДІАК%128%1заг%'
  AND oc.file_id IS NULL
  AND oc.inventory_id IS NULL
  AND (regexp_match(oc.parsed, '128-1заг\.-([0-9]+)ч\.[0-9]+'))[1] = f.code;

-- verification: expect 25 new files, 93 rows updated, 0 remaining unlinked
SELECT count(*) AS new_files FROM tmp_new_files;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed ILIKE '%ЦДІАК%128%1заг%' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;
