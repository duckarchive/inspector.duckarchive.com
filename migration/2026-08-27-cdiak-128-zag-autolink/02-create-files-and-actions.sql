-- Create the missing ЦДІАК-128-{1,2,3} files (bulk-import shape) and queue
-- PENDING connect_to_online_copy file_actions for admin review in the editor.
-- Files must exist first because connect actions need a real file_id; the
-- reviewable decision (copy ↔ file) stays in the queue, nothing is linked here.
-- After review: accept-actions.sql -v who=script:2026-08-27-cdiak-128-zag
-- Undo pending: rollback-pending-actions.sql -v who=script:2026-08-27-cdiak-128-zag
-- Run from this folder: psql … -f 02-create-files-and-actions.sql
\set ON_ERROR_STOP on
\set who 'script:2026-08-27-cdiak-128-zag'

BEGIN;

CREATE TEMP TABLE t_cand AS
SELECT oc.id AS oc_id, oc.url, oc.parsed,
       (regexp_match(oc.parsed, '^ЦДІАК-\(128-(\d+)заг\.-([^+]*)\+\+\+'))[1] AS inv,
       btrim((regexp_match(oc.parsed, '^ЦДІАК-\(128-(\d+)заг\.-([^+]*)\+\+\+'))[2]) AS spr
FROM online_copies oc
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed LIKE 'ЦДІАК-(128-%заг%'
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

CREATE TEMP TABLE t_map AS
SELECT n.oc_id, n.url, n.parsed, n.inv, n.spr, n.spr_norm, i.id AS inventory_id
FROM (
  SELECT c.*,
         upper(regexp_replace(regexp_replace(c.spr, '\.?\s*ч\.?\s*\d+$', ''), '\.\d+$', '')) AS spr_norm
  FROM t_cand c
  WHERE c.inv IS NOT NULL
) n
JOIN inventories i
  ON i.code = n.inv
 AND i.fond_id = (SELECT fo.id FROM fonds fo JOIN archives a ON fo.archive_id = a.id
                  WHERE a.code = 'ЦДІАК' AND fo.code = '128')
WHERE n.spr_norm ~ '^\d+[А-ЯІЇЄҐ]{0,2}$' AND length(n.spr_norm) <= 20;

-- === create missing files, bulk-import shape ===
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT m.spr_norm,
         'ЦДІАК-128-' || m.inv || '-' || m.spr_norm,
         m.inventory_id
  FROM t_map m
  WHERE NOT EXISTS (SELECT 1 FROM files f
                    WHERE f.inventory_id = m.inventory_id AND f.code = m.spr_norm)
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1)
SELECT 'files created' AS step, count(*) FROM ins;

-- === queue PENDING connect actions for admin review ===
CREATE TEMP TABLE t_act AS
SELECT m.oc_id, f.id AS file_id, f.full_code, m.spr AS fs_sprava, m.url
FROM t_map m
JOIN files f ON f.inventory_id = m.inventory_id AND f.code = m.spr_norm;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy',
         'заг: FS 128-Xзаг.-N = ЦДІАК-128-X-N; ч.* parts share the base справа',
         oc_id, file_id
  FROM t_act
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'pending file actions created' AS step, count(*) FROM ins;

\copy (SELECT full_code, fs_sprava, oc_id, url FROM t_act ORDER BY full_code) TO 'audit/created-actions.csv' CSV HEADER

-- sanity: no duplicate full_code introduced
DO $$ BEGIN
  IF EXISTS (SELECT full_code FROM files GROUP BY full_code HAVING count(*) > 1 LIMIT 1) THEN
    RAISE EXCEPTION 'duplicate full_code detected';
  END IF;
END $$;

COMMIT;
