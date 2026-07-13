-- Step 1: salvage legacy-imported online copies, then delete them.
-- See migration/FIX-COPIES.md for full rationale and verified numbers.
BEGIN;

-- 1a. Salvage into permanent tables: audit trail + the only surviving legacy url→instance map.
CREATE TABLE mig_removed_file_copies AS
SELECT foc.*
FROM file_online_copies foc
JOIN files f ON f.id = foc.file_id
WHERE foc.updated_at >= '2026-07-06 16:00' AND foc.updated_at < '2026-07-06 19:00'
  AND foc.parsed = f.full_code;
CREATE INDEX ON mig_removed_file_copies (url);

CREATE TABLE mig_removed_inventory_copies AS
SELECT ioc.*
FROM inventory_online_copies ioc
JOIN inventories i ON i.id = ioc.inventory_id
JOIN fonds fo    ON fo.id = i.fond_id
JOIN archives a  ON a.id = fo.archive_id
WHERE ioc.updated_at >= '2026-07-06 16:00' AND ioc.updated_at < '2026-07-06 19:00'
  AND ioc.parsed = a.code || '-' || fo.code || '-' || i.code;
CREATE INDEX ON mig_removed_inventory_copies (url);

-- 1b. Assertions — abort on any mismatch.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM mig_removed_file_copies;
  IF n <> 1641283 THEN RAISE EXCEPTION 'file salvage % <> 1641283', n; END IF;
  SELECT count(*) INTO n FROM mig_removed_inventory_copies;
  IF n <> 6074 THEN RAISE EXCEPTION 'inventory salvage % <> 6074', n; END IF;
  SELECT count(*) INTO n FROM file_actions
    WHERE online_copy_id IN (SELECT id FROM mig_removed_file_copies);
  IF n <> 0 THEN RAISE EXCEPTION '% file_actions would cascade', n; END IF;
  SELECT count(*) INTO n FROM inventory_actions
    WHERE online_copy_id IN (SELECT id FROM mig_removed_inventory_copies);
  IF n <> 0 THEN RAISE EXCEPTION '% inventory_actions would cascade', n; END IF;
END $$;

-- 1c. Delete by salvaged id.
DELETE FROM file_online_copies foc
USING mig_removed_file_copies r WHERE foc.id = r.id;

DELETE FROM inventory_online_copies ioc
USING mig_removed_inventory_copies r WHERE ioc.id = r.id;

-- Report before commit (visible in transaction).
SELECT 'file_online_copies' AS t, count(*) FROM file_online_copies
UNION ALL SELECT 'inventory_online_copies', count(*) FROM inventory_online_copies
UNION ALL SELECT 'mig_removed_file_copies', count(*) FROM mig_removed_file_copies
UNION ALL SELECT 'mig_removed_inventory_copies', count(*) FROM mig_removed_inventory_copies;

COMMIT;
