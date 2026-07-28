-- Delete BLANK inventories from the manual-review leftovers (2026-07-28).
-- Input: migration/out/inventory-code-anomalies/REVIEW-remaining.csv
-- These survived delete-empty-anomalous-inventories.sql only because they have
-- files attached; verification showed the attached files are part of the same
-- range-parsing artifact (inv code = range start, single file code = range end,
-- everything NULL-titled with zero child records).
--
-- Deletion criteria (an inventory from the CSV is deleted iff ALL hold):
--   * inventory title is NULL/empty; no inventory_online_copies,
--     inventory_actions, inventory_years, sync_tasks;
--   * every attached file has NULL/empty title and no file_online_copies,
--     file_actions, file_authors, file_locations, file_years;
--   * numeric code is NOT year-like (1800-2030) — same data-owner exclusion
--     as the previous pass.
-- Attached (blank) files are deleted first, then the inventories.
-- Audit rows go to mig_inv_anomaly_delete, buckets 'review-blank' /
-- 'review-blank-file'.

BEGIN;

CREATE TEMP TABLE review_codes (full_code text PRIMARY KEY);
\copy review_codes FROM PROGRAM 'tail -n +2 migration/out/inventory-code-anomalies/REVIEW-remaining.csv | cut -d, -f1'

-- CSV rows matched back to inventories by exact reconstructed full_code.
CREATE TEMP TABLE cand AS
SELECT i.id, i.code, i.title, rc.full_code
FROM review_codes rc
JOIN archives a  ON rc.full_code LIKE a.code || '-%'
JOIN fonds fo    ON fo.archive_id = a.id
JOIN inventories i ON i.fond_id = fo.id
 AND a.code || '-' || fo.code || '-' || i.code = rc.full_code;

CREATE TEMP TABLE del AS
SELECT c.id, c.code, c.full_code
FROM cand c
WHERE coalesce(c.title, '') = ''
  AND NOT coalesce((regexp_match(c.code, '^\d+'))[1]::bigint BETWEEN 1800 AND 2030, false)
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions      x WHERE x.inventory_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_years        x WHERE x.inventory_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM sync_tasks             x WHERE x.inventory_id = c.id)
  AND NOT EXISTS (
    SELECT 1 FROM files f
    WHERE f.inventory_id = c.id
      AND (coalesce(f.title, '') <> ''
        OR EXISTS (SELECT 1 FROM file_online_copies x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_actions       x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_authors       x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_locations     x WHERE x.file_id = f.id)
        OR EXISTS (SELECT 1 FROM file_years         x WHERE x.file_id = f.id)));

-- audit (table exists from the previous pass)
INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT d.full_code || '-' || f.code, 'review-blank-file', ''
FROM del d JOIN files f ON f.inventory_id = d.id;

INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT d.full_code, 'review-blank', '' FROM del d;

DELETE FROM files WHERE inventory_id IN (SELECT id FROM del);
DELETE FROM inventories WHERE id IN (SELECT id FROM del);

-- report + export deleted codes for CSV cleanup
SELECT (SELECT count(*) FROM review_codes)                          AS csv_rows,
       (SELECT count(*) FROM cand)                                  AS matched_in_db,
       (SELECT count(*) FROM del)                                   AS deleted_invs,
       (SELECT count(*) FROM mig_inv_anomaly_delete
         WHERE bucket = 'review-blank-file'
           AND deleted_at >= now() - interval '1 minute')           AS deleted_files;

\copy (SELECT full_code FROM del ORDER BY full_code) TO 'migration/out/inventory-code-anomalies/deleted-blank.txt'

-- what stays for manual review, and why
SELECT rc.full_code,
       CASE
         WHEN c.id IS NULL THEN 'not in DB (already gone)'
         WHEN coalesce((regexp_match(c.code,'^\d+'))[1]::bigint BETWEEN 1800 AND 2030, false)
           THEN 'year-like code'
         ELSE 'not blank'
       END AS keep_reason
FROM review_codes rc
LEFT JOIN cand c ON c.full_code = rc.full_code
WHERE NOT EXISTS (SELECT 1 FROM del d WHERE d.full_code = rc.full_code)
ORDER BY 2, 1;

COMMIT;
