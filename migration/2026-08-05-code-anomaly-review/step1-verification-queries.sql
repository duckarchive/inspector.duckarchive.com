-- STEP 1: verification queries — READ ONLY. Re-runs the anomaly detection so the
-- numbers can be compared with anomalies.csv before executing steps 2/3.
-- Detector: per inventory (>=8 distinct integer codes), a file is anomalous when
-- its integer part exceeds max(5 × p95, p95 + 100) of the inventory's codes.

SET statement_timeout = '560s';
SET work_mem = '1GB';

CREATE TEMP TABLE fi AS
SELECT f.id, f.code, f.full_code, f.inventory_id, f.title,
       nullif(regexp_replace(f.code, '[^0-9].*$', ''), '')::bigint AS ci
FROM files f;
CREATE INDEX ON fi(inventory_id, ci);
ANALYZE fi;

CREATE TEMP TABLE ivs AS
SELECT inventory_id, count(DISTINCT ci) AS nd,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY ci) AS p95v
FROM fi WHERE ci IS NOT NULL GROUP BY 1;

CREATE TEMP TABLE anom AS
SELECT fi.*, s.nd, s.p95v FROM fi JOIN ivs s USING (inventory_id)
WHERE fi.ci IS NOT NULL AND s.nd >= 8
  AND fi.ci > greatest(5 * s.p95v, s.p95v + 100);

-- expected (2026-08-05): 1380 anomalies / 354 inventories
SELECT count(*) AS anomalous_files, count(DISTINCT inventory_id) AS inventories FROM anom;

-- expected: concat 1232, isolated 89, year-like 59
SELECT CASE WHEN a.ci BETWEEN 1800 AND 2030 THEN 'year-like'
            WHEN EXISTS (SELECT 1 FROM fi b
                         WHERE b.inventory_id = a.inventory_id AND b.ci IS NOT NULL
                           AND b.ci < a.p95v AND a.ci::text LIKE b.ci::text || '%'
                           AND length(a.ci::text) - length(b.ci::text) BETWEEN 1 AND 4)
              THEN 'concat'
            ELSE 'isolated' END AS class, count(*)
FROM anom a GROUP BY 1 ORDER BY 2 DESC;

-- per-archive distribution (compare with inventory-summary.csv)
SELECT ar.code AS arch, count(*) AS anomalies
FROM anom a
JOIN inventories i ON i.id = a.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives ar ON ar.id = fo.archive_id
GROUP BY 1 ORDER BY 2 DESC;
