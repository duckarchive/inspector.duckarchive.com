-- Preview (READ-ONLY) of the root-DGS dedup. Writes audit/preview.csv.
-- Run from this folder:
--   psql … -f 01-preview.sql
\set ON_ERROR_STOP on
BEGIN;
\i 00-candidates.sql

\copy (SELECT CASE WHEN l.file_id IS NOT NULL THEN 'file' ELSE 'inventory' END AS target, COALESCE(l.file_id, l.inventory_id) AS target_id, o.url AS root_url, o.parsed AS root_parsed, l.survivor_id, sv.url AS survivor_url, sv.parsed AS survivor_parsed FROM t_losers l JOIN online_copies o ON o.id = l.loser_id JOIN online_copies sv ON sv.id = l.survivor_id ORDER BY target, target_id) TO 'audit/preview.csv' CSV HEADER

SELECT 'root copies to delete' AS what, count(*) FROM t_losers
UNION ALL SELECT 'distinct files affected', count(DISTINCT file_id) FROM t_losers WHERE file_id IS NOT NULL
UNION ALL SELECT 'distinct inventories affected', count(DISTINCT inventory_id) FROM t_losers WHERE inventory_id IS NOT NULL
UNION ALL SELECT 'roots with >1 same-target specific sibling', count(*) FROM (
  SELECT loser_id FROM t_matches GROUP BY loser_id HAVING count(*) > 1) x
UNION ALL SELECT 'file_actions to repoint', count(*) FROM file_actions fa JOIN t_losers l ON l.loser_id = fa.online_copy_id
UNION ALL SELECT 'inventory_actions to repoint', count(*) FROM inventory_actions ia JOIN t_losers l ON l.loser_id = ia.online_copy_id
UNION ALL SELECT 'pending actions among them (must be 0)', count(*) FROM (
  SELECT 1 FROM file_actions fa JOIN t_losers l ON l.loser_id = fa.online_copy_id WHERE fa.resolved_at IS NULL
  UNION ALL
  SELECT 1 FROM inventory_actions ia JOIN t_losers l ON l.loser_id = ia.online_copy_id WHERE ia.resolved_at IS NULL) x;

ROLLBACK;
