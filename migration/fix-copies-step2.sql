-- Step 2: re-attach pass — legacy url -> instance, for rows that survived Step 1's delete.
-- Expected to attach ~0 rows (A1/A2 ran before Step B and already attached everything
-- unambiguous); exists to make the end state provably complete. See migration/FIX-COPIES.md.
BEGIN;

WITH url_map AS (
  SELECT url, min(file_id::text)::uuid AS file_id
  FROM mig_removed_file_copies
  GROUP BY url HAVING count(DISTINCT file_id) = 1
)
UPDATE file_online_copies foc SET file_id = um.file_id
FROM url_map um
WHERE foc.file_id IS NULL AND foc.url = um.url
  AND NOT EXISTS (SELECT 1 FROM file_online_copies x
                  WHERE x.resource_id = foc.resource_id AND x.file_id = um.file_id
                    AND x.parsed = foc.parsed AND x.url = foc.url)
  AND NOT EXISTS (SELECT 1 FROM file_online_copies y
                  WHERE y.url = foc.url AND y.file_id IS NOT NULL
                    AND y.file_id <> um.file_id);

WITH url_map AS (
  SELECT url, min(inventory_id::text)::uuid AS inventory_id
  FROM mig_removed_inventory_copies
  GROUP BY url HAVING count(DISTINCT inventory_id) = 1
)
UPDATE inventory_online_copies ioc SET inventory_id = um.inventory_id
FROM url_map um
WHERE ioc.inventory_id IS NULL AND ioc.url = um.url
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies x
                  WHERE x.resource_id = ioc.resource_id AND x.inventory_id = um.inventory_id
                    AND x.parsed = ioc.parsed AND x.url = ioc.url)
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies y
                  WHERE y.url = ioc.url AND y.inventory_id IS NOT NULL
                    AND y.inventory_id <> um.inventory_id);

SELECT 'file_online_copies attached' AS t, count(*) FROM file_online_copies WHERE file_id IS NOT NULL
UNION ALL SELECT 'inventory_online_copies attached', count(*) FROM inventory_online_copies WHERE inventory_id IS NOT NULL;

COMMIT;
