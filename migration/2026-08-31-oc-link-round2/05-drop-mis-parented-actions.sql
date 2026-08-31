-- Drop round-2 actions whose url twin is already linked to a DIFFERENT file that
-- shares this опис code and справа code but sits under another fond — i.e. the
-- EXISTING link is mis-parented, not ours.
--
-- Case found 2026-08-31: ДАЧкО fond "9310" is an untitled 112-file artifact from
-- an earlier create-missing round; the real fond is "931" ("Колекція. Метричні
-- книги записів актів цивільного стану", 5,773 files). Our match (931) is the
-- correct one, but accepting it while the 9310 link still stands would show the
-- same copy twice in the UI. So these are held back until the fond is cleaned up
-- — a separate decision, since it means deleting or re-parenting fond 9310.
--
-- This only removes PENDING actions. It touches no online_copies and no catalog
-- rows. Writes audit/mis-parented-actions.csv for the follow-up.
-- Run from this folder:
--   psql … -v who=script:2026-08-31-oc-link-r2 -f 05-drop-mis-parented-actions.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t_d2 AS
SELECT DISTINCT fa.id AS action_id, fa.online_copy_id, oc.url, oc.parsed,
       fm.full_code AS would_link_to, f2.full_code AS existing_link
FROM file_actions fa
JOIN online_copies oc ON oc.id = fa.online_copy_id
JOIN files fm ON fm.id = fa.file_id
JOIN online_copies o2 ON o2.resource_id = oc.resource_id AND o2.url = oc.url
 AND o2.id <> oc.id AND o2.file_id IS NOT NULL AND o2.file_id <> fa.file_id
JOIN files f2 ON f2.id = o2.file_id
JOIN inventories im ON im.id = fm.inventory_id
JOIN inventories i2 ON i2.id = f2.inventory_id
WHERE fa.created_by = :'who' AND fa.type = 'connect_to_online_copy'
  AND fa.resolved_at IS NULL
  AND f2.code = fm.code AND i2.code = im.code AND im.fond_id <> i2.fond_id;

\copy (SELECT would_link_to, existing_link, parsed, url, online_copy_id, action_id FROM t_d2 ORDER BY would_link_to) TO 'audit/mis-parented-actions.csv' CSV HEADER

SELECT would_link_to, existing_link, count(*) AS actions
FROM t_d2 GROUP BY 1, 2 ORDER BY 1;

WITH del AS (
  DELETE FROM file_actions fa USING t_d2 d WHERE fa.id = d.action_id
  RETURNING 1)
SELECT 'mis-parented actions dropped' AS step, count(*) FROM del;

SELECT 'pending file actions left' AS what, count(*) FROM file_actions
WHERE created_by = :'who' AND resolved_at IS NULL
UNION ALL SELECT 'pending inventory actions left', count(*) FROM inventory_actions
WHERE created_by = :'who' AND resolved_at IS NULL;

COMMIT;
