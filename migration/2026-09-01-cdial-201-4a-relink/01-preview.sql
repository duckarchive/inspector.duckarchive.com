-- Preview (READ-ONLY) of the ЦДІАЛ-201-4А relink. Writes audit/preview.csv.
-- Run from this folder:
--   psql … -f 01-preview.sql
\set ON_ERROR_STOP on
BEGIN;
\i 00-mapping.sql

\copy (SELECT dgs, seq, file_code, copy_id, url, old_parsed FROM t_targets ORDER BY dgs, seq) TO 'audit/preview.csv' CSV HEADER

SELECT 'mapping rows' AS what, count(*) FROM t_mapping
UNION ALL SELECT 'matched online_copies (expect same count)', count(*) FROM t_targets
UNION ALL SELECT 'distinct target files', count(DISTINCT file_id) FROM t_targets
UNION ALL SELECT 'mapping rows with NO matching online_copy (must be 0)', count(*) FROM (
  SELECT m.dgs, m.seq FROM t_mapping m
  LEFT JOIN t_targets t ON t.dgs = m.dgs AND t.seq = m.seq
  WHERE t.copy_id IS NULL) x
UNION ALL SELECT 'would-collide with an existing (resource,inv=NULL,file,parsed,url) row (must be 0)', count(*) FROM (
  SELECT t.copy_id FROM t_targets t
  JOIN online_copies oc2
    ON oc2.resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7'
   AND oc2.file_id = t.file_id
   AND oc2.parsed = t.old_parsed
   AND oc2.url = t.url
   AND oc2.id <> t.copy_id) x
UNION ALL SELECT 'pending actions on these copies (informational)', count(*) FROM (
  SELECT 1 FROM file_actions fa JOIN t_targets t ON t.copy_id = fa.online_copy_id WHERE fa.resolved_at IS NULL
  UNION ALL
  SELECT 1 FROM inventory_actions ia JOIN t_targets t ON t.copy_id = ia.online_copy_id WHERE ia.resolved_at IS NULL) x;

ROLLBACK;
