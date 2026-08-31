-- Preview (READ-ONLY) of the parsed-drift merge. Writes audit/dedup-preview.csv.
-- Run from this folder:
--   psql … -v who=script:2026-08-31-oc-link-r2 -f 03-dedup-preview.sql
\set ON_ERROR_STOP on
BEGIN;
\i 03-dedup-groups.sql

\copy (SELECT l.target, l.target_id, o.url, l.loser_id, o.parsed AS loser_parsed, l.is_linked AS loser_was_linked, l.survivor_id, sv.parsed AS survivor_parsed_before, rp.latest_parsed AS survivor_parsed_after FROM t_losers l JOIN online_copies o ON o.id = l.loser_id JOIN online_copies sv ON sv.id = l.survivor_id LEFT JOIN t_reparse rp ON rp.survivor_id = l.survivor_id ORDER BY l.target, o.url) TO 'audit/dedup-preview.csv' CSV HEADER

SELECT 'groups touched'                       AS what, count(*) FROM t_survivor
UNION ALL SELECT 'rows to delete (total)',              count(*) FROM t_losers
UNION ALL SELECT '  of them unlinked (this round)',     count(*) FROM t_losers WHERE NOT is_linked
UNION ALL SELECT '  of them already-linked extras',     count(*) FROM t_losers WHERE is_linked
UNION ALL SELECT 'survivors getting latest parsed',     count(*) FROM t_reparse
UNION ALL SELECT 'reparse BLOCKED by guard (must be 0)', count(*) FROM t_reparse_blocked
UNION ALL SELECT 'round actions to drop',               count(*) FROM t_round r JOIN t_losers l ON l.loser_id = r.oc_id
UNION ALL SELECT 'other actions to repoint',            count(*) FROM (
  SELECT 1 FROM file_actions fa JOIN t_losers l ON l.loser_id = fa.online_copy_id
  WHERE fa.created_by <> :'who' OR fa.resolved_at IS NOT NULL
  UNION ALL
  SELECT 1 FROM inventory_actions ia JOIN t_losers l ON l.loser_id = ia.online_copy_id
  WHERE ia.created_by <> :'who' OR ia.resolved_at IS NOT NULL) x;

\echo '--- sample: survivor parsed before -> after ---'
SELECT left(current_parsed, 44) AS before, left(latest_parsed, 44) AS after
FROM t_reparse ORDER BY random() LIMIT 10;

ROLLBACK;
