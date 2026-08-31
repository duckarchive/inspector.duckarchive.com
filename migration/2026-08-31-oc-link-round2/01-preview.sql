-- Preview (READ-ONLY): round-2 link candidates for unlinked online_copies.
-- Builds the same candidate set 02-create-actions.sql will queue, prints the
-- counts, and writes audit/preview-links.csv. Nothing is modified.
-- Run from this folder: psql … -f 01-preview.sql
\set ON_ERROR_STOP on

BEGIN;

\i 00-candidates.sql

\copy (SELECT m.target, m.rule, m.code AS target_full_code, u.parsed, u.res AS resource, m.oc_id, m.target_id, u.url FROM t_map m JOIN t_un u ON u.oc_id = m.oc_id ORDER BY m.target, m.rule, m.code) TO 'audit/preview-links.csv' CSV HEADER

SELECT 'unlinked pool (parsed <> '''', no pending action)' AS what, count(*) FROM t_un
UNION ALL SELECT 'candidate codes generated', count(*) FROM t_cand
UNION ALL SELECT 'copies mapped (unique target)', count(*) FROM t_map
UNION ALL SELECT '  → link to existing file', count(*) FROM t_map WHERE target = 'file'
UNION ALL SELECT '  → link to existing inventory', count(*) FROM t_map WHERE target = 'inventory'
UNION ALL SELECT 'AMBIGUOUS, dropped', count(*) FROM t_ambiguous;

\echo '--- by rule ---'
SELECT rule, target, count(*) AS copies, count(DISTINCT target_id) AS distinct_targets
FROM t_map GROUP BY rule, target ORDER BY rule, target;

\echo '--- by archive ---'
SELECT split_part(code, '-', 1) AS archive, target, count(*) AS copies
FROM t_map GROUP BY 1, 2 ORDER BY 3 DESC;

\echo '--- sanity: 12 random file matches vs catalog ---'
SELECT m.rule, m.code AS target_full_code, left(u.parsed, 58) AS parsed, left(f.title, 40) AS catalog_title
FROM t_map m JOIN t_un u ON u.oc_id = m.oc_id JOIN files f ON f.id = m.target_id
WHERE m.target = 'file' ORDER BY random() LIMIT 12;

ROLLBACK;
