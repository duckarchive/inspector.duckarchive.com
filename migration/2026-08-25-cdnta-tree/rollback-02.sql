-- rollback-02.sql — undo 02-relink-copies.sql.
-- Run from this folder AFTER rollback-03.sql (old files must exist again).
\set ON_ERROR_STOP on
BEGIN;

-- 1. restore copies deleted by the dedup pass
CREATE TEMP TABLE r_dup (LIKE online_copies INCLUDING DEFAULTS);
\copy r_dup FROM 'audit/dedup-deleted.csv' CSV HEADER
INSERT INTO online_copies SELECT * FROM r_dup ON CONFLICT (id) DO NOTHING;

-- 2. restore original links of relinked copies
CREATE TEMP TABLE r_map (
  copy_id uuid, parsed text, method text, old_file_id uuid,
  old_inventory_id uuid, new_file_id uuid, new_full_code text, deleted_as_dup boolean);
\copy r_map FROM 'audit/relink-map.csv' CSV HEADER
UPDATE online_copies oc
SET file_id = m.old_file_id, inventory_id = m.old_inventory_id, updated_at = now()
FROM r_map m
WHERE oc.id = m.copy_id AND NOT m.deleted_as_dup;

-- 3. restore links of skipped copies that were unlinked from the bogus tree
CREATE TEMP TABLE r_skip (copy_id uuid, old_file_id uuid);
\copy r_skip FROM 'audit/skipped-unlinked.csv' CSV HEADER
UPDATE online_copies oc
SET file_id = s.old_file_id, updated_at = now()
FROM r_skip s WHERE oc.id = s.copy_id;

-- 4. un-resolve the superseded inventory_actions
UPDATE inventory_actions
SET resolved_at = NULL, resolved_by = NULL, is_rejected = NULL,
    note = nullif(regexp_replace(coalesce(note, ''),
      '( \| )?superseded: комплексні таблиці ЦДНТА розшифровано$', ''), '')
WHERE resolved_by = 'migration:2026-08-25-cdnta-tree';

-- 5. delete gap files created by step 1 of 02 (files with copies restored away
--    from them; only those absent from the bulk file_ranges creation)
--    Identified as: files in the new tree with zero online_copies that are NOT
--    covered by file_ranges.csv (safe to leave in place; delete manually if needed).

SELECT 'rollback-02 done' AS step,
  (SELECT count(*) FROM r_dup) AS dup_restored,
  (SELECT count(*) FROM r_map WHERE NOT deleted_as_dup) AS links_restored,
  (SELECT count(*) FROM r_skip) AS skip_links_restored;

COMMIT;
