-- FINALIZE: drop legacy fund→description→case data after all archives are
-- migrated and verified. Destructive and irreversible — run only once the
-- reconcile.sql output looks correct and the app reads from the new tables.
--
--   psql -d inspector_local -f migration/finalize.sql
--
-- Wrapped in a transaction so a mistake can still be rolled back before COMMIT.

BEGIN;

-- sync_tasks (out of scope) carries vestigial all-NULL FKs to the legacy tables
-- that block TRUNCATE. Guard that they're empty, then drop just those two FKs.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM sync_tasks WHERE fund_id IS NOT NULL OR description_id IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION 'sync_tasks has % rows referencing legacy tables — aborting', n; END IF;
END $$;
ALTER TABLE sync_tasks DROP CONSTRAINT IF EXISTS sync_tasks_fund_id_fkey;
ALTER TABLE sync_tasks DROP CONSTRAINT IF EXISTS sync_tasks_description_id_fkey;

-- child/satellite tables first (FKs), then parents
TRUNCATE TABLE
  case_online_copies,
  case_authors,
  case_locations,
  case_years,
  description_online_copies,
  description_years,
  fund_years,
  cases,
  descriptions,
  funds
RESTART IDENTITY;

-- Inspect counts here; they must all be 0 before committing.
SELECT 'funds' AS t, count(*) FROM funds
UNION ALL SELECT 'descriptions', count(*) FROM descriptions
UNION ALL SELECT 'cases', count(*) FROM cases
UNION ALL SELECT 'case_online_copies', count(*) FROM case_online_copies;

-- COMMIT;   -- uncomment to apply
ROLLBACK;    -- default: no-op until you deliberately switch to COMMIT
