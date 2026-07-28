-- Delete ДАКрО year-like anomalous описи (2026-07-28, data-owner approved).
-- 209 rows from REVIEW-remaining.csv: one per fond, code = a year (1918-…),
-- title 'Опис <рік>', ZERO children anywhere — an artifact of the old scraper
-- misparsing the fond date range in the «Анотований реєстр описів» as an
-- опис number. Real описи will be recreated from R_rad2-2.pdf (Том 2 Кн. 2,
-- №№ Р-1003 – Р-2475) by the follow-up enrichment.
-- Audit bucket 'review-yearlike-dakro' in mig_inv_anomaly_delete.

BEGIN;

CREATE TEMP TABLE rc (full_code text PRIMARY KEY);
\copy rc FROM PROGRAM 'grep "^ДАКрО" migration/out/inventory-code-anomalies/REVIEW-remaining.csv | cut -d, -f1 | awk -F- ''$NF+0>=1800 && $NF+0<=2030'''

CREATE TEMP TABLE del AS
SELECT i.id, i.title, rc.full_code
FROM rc
JOIN archives a ON a.code='ДАКрО'
JOIN fonds fo ON fo.archive_id=a.id
JOIN inventories i ON i.fond_id=fo.id AND 'ДАКрО-'||fo.code||'-'||i.code = rc.full_code
WHERE NOT EXISTS (SELECT 1 FROM files x                  WHERE x.inventory_id=i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id=i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions x       WHERE x.inventory_id=i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_years x         WHERE x.inventory_id=i.id)
  AND NOT EXISTS (SELECT 1 FROM sync_tasks x              WHERE x.inventory_id=i.id);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM del;
  IF n <> (SELECT count(*) FROM rc) THEN
    RAISE EXCEPTION 'expected all % CSV rows blank+matched, got %', (SELECT count(*) FROM rc), n;
  END IF;
END $$;

INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT full_code, 'review-yearlike-dakro', coalesce(title,'') FROM del;

DELETE FROM inventories WHERE id IN (SELECT id FROM del);

SELECT count(*) AS deleted FROM del;
\copy (SELECT full_code FROM del ORDER BY full_code) TO 'migration/out/inventory-code-anomalies/deleted-dakro-yearlike.txt'

COMMIT;
