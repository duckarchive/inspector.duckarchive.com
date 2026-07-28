-- Delete ЦДАВО year-like anomalous описи (2026-07-28, data-owner approved:
-- "dummy parsing error, no need to fix").
-- 93 rows from REVIEW-remaining.csv: опис code = year, NULL titles; 92 hold
-- 161 shell files ALL titled «Описи справ архіву (довідкові матеріали без
-- дати)» with year-codes, no copies/actions/authors/locations, only a year
-- row mirroring the code. Whole subtree deleted with audit.
-- Buckets: review-yearlike-cdavo / review-yearlike-cdavo-file.

BEGIN;

CREATE TEMP TABLE rc (full_code text PRIMARY KEY);
\copy rc FROM PROGRAM 'grep "^ЦДАВО" migration/out/inventory-code-anomalies/REVIEW-remaining.csv | cut -d, -f1 | awk -F- ''$NF+0>=1800 && $NF+0<=2030'''

CREATE TEMP TABLE del AS
SELECT i.id, i.title, rc.full_code, fo.code AS fond_code
FROM rc
JOIN archives a ON a.code='ЦДАВО'
JOIN fonds fo ON fo.archive_id=a.id
JOIN inventories i ON i.fond_id=fo.id AND 'ЦДАВО-'||fo.code||'-'||i.code = rc.full_code;

CREATE TEMP TABLE delf AS
SELECT f.id, f.code, f.title, d.full_code
FROM del d JOIN files f ON f.inventory_id=d.id;

-- safety: the files must all be the known placeholder shells with no children
DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM del) <> (SELECT count(*) FROM rc) THEN
    RAISE EXCEPTION 'CSV rows not all matched in DB';
  END IF;
  SELECT count(*) INTO n FROM delf
  WHERE title NOT IN ('Описи справ архіву (довідкові матеріали без дати)',
                      'Документи центральних установ України - 1917-1933')
     OR EXISTS (SELECT 1 FROM file_online_copies x WHERE x.file_id=delf.id)
     OR EXISTS (SELECT 1 FROM file_actions x       WHERE x.file_id=delf.id)
     OR EXISTS (SELECT 1 FROM file_authors x       WHERE x.file_id=delf.id)
     OR EXISTS (SELECT 1 FROM file_locations x     WHERE x.file_id=delf.id);
  IF n <> 0 THEN RAISE EXCEPTION '% files are not placeholder shells', n; END IF;
  SELECT count(*) INTO n FROM del
  WHERE EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id=del.id)
     OR EXISTS (SELECT 1 FROM inventory_actions x       WHERE x.inventory_id=del.id)
     OR EXISTS (SELECT 1 FROM sync_tasks x              WHERE x.inventory_id=del.id);
  IF n <> 0 THEN RAISE EXCEPTION '% inventories have non-file children', n; END IF;
END $$;

INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT full_code || '-' || code, 'review-yearlike-cdavo-file', coalesce(title,'') FROM delf;
INSERT INTO mig_inv_anomaly_delete (full_code, bucket, title)
SELECT full_code, 'review-yearlike-cdavo', coalesce(title,'') FROM del;

DELETE FROM file_years WHERE file_id IN (SELECT id FROM delf);
DELETE FROM files WHERE id IN (SELECT id FROM delf);
DELETE FROM inventory_years WHERE inventory_id IN (SELECT id FROM del);
DELETE FROM inventories WHERE id IN (SELECT id FROM del);

-- shell fonds: blank title, nothing left inside
DELETE FROM fonds fo
USING archives a
WHERE a.id=fo.archive_id AND a.code='ЦДАВО'
  AND fo.code IN (SELECT DISTINCT fond_code FROM del)
  AND coalesce(fo.title,'')=''
  AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id=fo.id);

SELECT (SELECT count(*) FROM del) AS invs_deleted, (SELECT count(*) FROM delf) AS files_deleted;
\copy (SELECT full_code FROM del ORDER BY full_code) TO 'migration/out/inventory-code-anomalies/deleted-cdavo-yearlike.txt'

COMMIT;
