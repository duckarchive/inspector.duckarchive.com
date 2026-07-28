-- Delete EMPTY anomalous inventories (weird integer опис codes).
-- Scope (data-owner approved 2026-07-27):
--   A. within-fond outliers: numeric code above a >=10x jump in the fond's sorted
--      sequence, and >= 100  (the "1,2,3,707" pattern);
--   B. single-опис fonds whose only опис has numeric code >= 100.
-- Excluded from deletion (left for manual review):
--   * year-like codes (1800-2030) — some are genuine year-named довідкові описи;
--   * anything with files, online copies, actions, or years attached.
-- Audit table mig_inv_anomaly_delete kept permanently.

BEGIN;

CREATE TEMP TABLE inv_n AS
SELECT i.id, i.fond_id, i.code, (regexp_match(i.code, '^\d+'))[1]::bigint AS n
FROM inventories i WHERE i.code ~ '^\d+';

CREATE TEMP TABLE del AS
WITH ranked AS (
  SELECT id, fond_id, code, n, lag(n) OVER (PARTITION BY fond_id ORDER BY n) AS prev_n
  FROM inv_n),
split AS (
  SELECT fond_id, min(n) AS split_at FROM ranked
  WHERE prev_n IS NOT NULL AND n >= 100 AND n >= 10*prev_n GROUP BY 1),
multi AS (
  SELECT r.id, r.fond_id, r.code, r.n, 'multi-outlier'::text AS bucket
  FROM ranked r JOIN split s ON s.fond_id = r.fond_id AND r.n >= s.split_at),
single AS (
  SELECT x.id, x.fond_id, x.code, x.n, 'single-huge'::text AS bucket
  FROM inv_n x
  WHERE x.n >= 100 AND (SELECT count(*) FROM inv_n y WHERE y.fond_id = x.fond_id) = 1)
SELECT * FROM multi UNION ALL SELECT * FROM single;

-- exclusions
DELETE FROM del WHERE n BETWEEN 1800 AND 2030;                                  -- year-like → review
DELETE FROM del d WHERE EXISTS (SELECT 1 FROM files f WHERE f.inventory_id = d.id);
DELETE FROM del d WHERE EXISTS (SELECT 1 FROM inventory_online_copies c WHERE c.inventory_id = d.id);
DELETE FROM del d WHERE EXISTS (SELECT 1 FROM inventory_actions x WHERE x.inventory_id = d.id);
DELETE FROM del d WHERE EXISTS (SELECT 1 FROM inventory_years y WHERE y.inventory_id = d.id);
DELETE FROM del d WHERE EXISTS (SELECT 1 FROM sync_tasks s WHERE s.inventory_id = d.id);

-- audit
CREATE TABLE IF NOT EXISTS mig_inv_anomaly_delete (
  full_code text, bucket text, title text, deleted_at timestamp DEFAULT now());
INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT a.code || '-' || fo.code || '-' || d.code, d.bucket, COALESCE(i.title, '')
FROM del d JOIN inventories i ON i.id = d.id
JOIN fonds fo ON fo.id = d.fond_id JOIN archives a ON a.id = fo.archive_id;

DELETE FROM inventories WHERE id IN (SELECT id FROM del);

-- verify + report
DO $$
DECLARE n_del int;
BEGIN
  SELECT count(*) INTO n_del FROM del;
  RAISE NOTICE 'deleted % empty anomalous inventories', n_del;
END $$;
SELECT bucket, count(*) FROM del GROUP BY 1;

COMMIT;
