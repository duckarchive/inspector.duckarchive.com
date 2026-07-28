-- Second pass (2026-07-28): year-like-coded rows from REVIEW-remaining.csv.
-- The year-like exclusion (1800-2030) protects genuine year-named довідкові
-- описи. These 9 ДАПО rows are NOT that: NULL-titled, single NULL-titled
-- file, and they sit inside the range-tiling artifact sequences of fonds
-- whose siblings were already deleted in the 'review-blank' pass
-- (e.g. ДАПО-6: ...1643→1807, [1809→1932], [1935→2058], 2059→...).
-- Gate: only delete a year-like blank row if its fond already has >= 5
-- 'review-blank' audit deletions — i.e. the fond is a proven artifact fond.

BEGIN;

CREATE TEMP TABLE review_codes (full_code text PRIMARY KEY);
\copy review_codes FROM PROGRAM 'tail -n +2 migration/out/inventory-code-anomalies/REVIEW-remaining.csv | cut -d, -f1'

CREATE TEMP TABLE del AS
SELECT i.id, rc.full_code
FROM review_codes rc
JOIN archives a  ON rc.full_code LIKE a.code || '-%'
JOIN fonds fo    ON fo.archive_id = a.id
JOIN inventories i ON i.fond_id = fo.id
 AND a.code || '-' || fo.code || '-' || i.code = rc.full_code
WHERE coalesce(i.title, '') = ''
  AND (regexp_match(i.code, '^\d+'))[1]::bigint BETWEEN 1800 AND 2030
  -- fond is a proven artifact fond: >= 5 siblings already deleted as blank
  AND (SELECT count(*) FROM mig_inv_anomaly_delete m
       WHERE m.bucket = 'review-blank'
         AND m.full_code LIKE a.code || '-' || fo.code || '-%') >= 5
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions      x WHERE x.inventory_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_years        x WHERE x.inventory_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM sync_tasks             x WHERE x.inventory_id = i.id)
  AND NOT EXISTS (
    SELECT 1 FROM files f
    WHERE f.inventory_id = i.id
      AND (coalesce(f.title, '') <> ''
        OR EXISTS (SELECT 1 FROM file_online_copies x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_actions       x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_authors       x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_locations     x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_years         x WHERE x.file_id = f.id)));

INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT d.full_code || '-' || f.code, 'review-blank-file', ''
FROM del d JOIN files f ON f.inventory_id = d.id;

INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT d.full_code, 'review-blank-yearlike', '' FROM del d;

DELETE FROM files WHERE inventory_id IN (SELECT id FROM del);
DELETE FROM inventories WHERE id IN (SELECT id FROM del);

SELECT full_code FROM del ORDER BY full_code;

\copy (SELECT full_code FROM del ORDER BY full_code) TO 'migration/out/inventory-code-anomalies/deleted-blank-yearlike.txt'

COMMIT;
