-- ЦДІАК-128-1друк. online-copy linking
-- Target inventory: ЦДІАК-128-ДРУК1 "Друкарські справи" (id 9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c)
--
-- Same shape as the 2026-08-06-cdiak-128-1-zag-linking migration: 1227/1310
-- online_copies matching parsed ILIKE '%ЦДІАК%128%1друк%' are already
-- correctly linked. The remaining 83 reference "N ч.M" (частина/part) справи
-- across 37 distinct base справа numbers.
--
-- Unlike the -zag- case, 3 of those 37 base numbers (413, 501, 1294) already
-- exist as files in this inventory (each already linked to its own
-- no-suffix "128-1друк-N" online copy, confirming the base-file convention)
-- — those must NOT be recreated, only linked to. The other 34 are missing
-- and need creating, same as before.

BEGIN;

CREATE TEMP TABLE tmp_new_files AS
WITH bases AS (
  SELECT DISTINCT (regexp_match(parsed, '128-1друк-([0-9]+)ч\.[0-9]+'))[1] AS code
  FROM online_copies
  WHERE parsed ILIKE '%ЦДІАК%128%1друк%'
    AND file_id IS NULL
    AND inventory_id IS NULL
), missing AS (
  SELECT b.code
  FROM bases b
  LEFT JOIN files f
    ON f.inventory_id = '9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c' AND f.code = b.code
  WHERE f.id IS NULL
), inserted AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT code, 'ЦДІАК-128-ДРУК1-' || code, '9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c', now()
  FROM missing
  RETURNING id, code
)
SELECT * FROM inserted;

SELECT * FROM tmp_new_files ORDER BY code::int;

UPDATE online_copies oc
SET file_id = f.id
FROM files f
WHERE f.inventory_id = '9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c'
  AND oc.parsed ILIKE '%ЦДІАК%128%1друк%'
  AND oc.file_id IS NULL
  AND oc.inventory_id IS NULL
  AND (regexp_match(oc.parsed, '128-1друк-([0-9]+)ч\.[0-9]+'))[1] = f.code;

-- verification: expect 34 new files, 83 rows updated, 0 remaining unlinked
SELECT count(*) AS new_files FROM tmp_new_files;
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed ILIKE '%ЦДІАК%128%1друк%' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;
