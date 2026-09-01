-- Preview (READ-ONLY): what 04-execute.sql would merge. Writes audit/adopt-pairs.csv
-- and audit/ambiguous.csv. Nothing is modified (rolled back).
-- Run from this folder: psql … -v cutover='2026-09-02 10:00' -f 03-preview.sql
\set ON_ERROR_STOP on

BEGIN;

\i 02-cutover-groups.sql

SELECT 'stale linked legacy rows' AS what, count(*) FROM t_stale_linked
UNION ALL SELECT 'fresh keyed unlinked rows', count(*) FROM t_fresh_unlinked
UNION ALL SELECT '1:1 pairs to adopt', count(*) FROM t_pairs
UNION ALL SELECT 'ambiguous urls (review)', count(*) FROM t_ambiguous;

-- per resource
SELECT r.code, count(*) AS pairs
FROM t_pairs p JOIN resources r ON r.id = p.resource_id
GROUP BY 1 ORDER BY 2 DESC;

\copy (SELECT p.resource_id, p.url, p.survivor_id, p.doomed_id, p.stale_parsed, p.fresh_parsed, p.source_key, p.file_id, p.inventory_id FROM t_pairs p ORDER BY p.resource_id, p.url) TO 'audit/adopt-pairs.csv' CSV HEADER
\copy (SELECT a.resource_id, a.url, a.stale_linked, a.fresh_unlinked FROM t_ambiguous a ORDER BY a.resource_id, a.url) TO 'audit/ambiguous.csv' CSV HEADER

ROLLBACK;
