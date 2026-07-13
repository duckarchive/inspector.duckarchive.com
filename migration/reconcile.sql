-- Global reconciliation across all archives: legacy vs migrated.
-- Run after all archives are committed, before finalize.sql.
--   psql -d inspector_local -f migration/reconcile.sql

\echo '== entity counts: legacy vs new =='
SELECT
  (SELECT count(*) FROM funds)        AS legacy_funds,
  (SELECT count(*) FROM fonds)        AS new_fonds,
  (SELECT count(*) FROM descriptions) AS legacy_descriptions,
  (SELECT count(*) FROM inventories)  AS new_inventories,
  (SELECT count(*) FROM cases)        AS legacy_cases,
  (SELECT count(*) FROM files)        AS new_files;

\echo '== files with duplicate full_code (must be 0) =='
SELECT count(*) AS dup_full_code_groups FROM (
  SELECT full_code FROM files GROUP BY full_code HAVING count(*) > 1
) t;

\echo '== online copies: attached vs still-null =='
SELECT
  count(*) FILTER (WHERE file_id IS NOT NULL) AS attached,
  count(*) FILTER (WHERE file_id IS NULL)     AS unattached,
  count(*) AS total
FROM file_online_copies;

\echo '== per-archive: legacy cases vs new files =='
SELECT a.code,
  (SELECT count(*) FROM cases c JOIN descriptions d ON c.description_id=d.id JOIN funds f ON d.fund_id=f.id WHERE f.archive_id=a.id) AS legacy_cases,
  (SELECT count(*) FROM files fi JOIN inventories i ON fi.inventory_id=i.id JOIN fonds fo ON i.fond_id=fo.id WHERE fo.archive_id=a.id) AS new_files
FROM archives a
WHERE EXISTS (SELECT 1 FROM funds f WHERE f.archive_id=a.id)
ORDER BY legacy_cases DESC;
