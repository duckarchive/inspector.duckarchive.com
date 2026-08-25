-- rollback-03.sql — restore the bogus tree rows deleted by 03-drop-bogus.sql.
-- Run from this folder. Rollback order: 03 -> 02 -> 01.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE r_invs (LIKE inventories INCLUDING DEFAULTS);
\copy r_invs FROM 'audit/deleted-inventories.csv' CSV HEADER
INSERT INTO inventories SELECT * FROM r_invs;

CREATE TEMP TABLE r_files (LIKE files INCLUDING DEFAULTS);
\copy r_files FROM 'audit/deleted-files.csv' CSV HEADER
INSERT INTO files SELECT * FROM r_files;

CREATE TEMP TABLE r_ia (LIKE inventory_actions INCLUDING DEFAULTS);
\copy r_ia FROM 'audit/deleted-inventory-actions.csv' CSV HEADER
INSERT INTO inventory_actions SELECT * FROM r_ia ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE r_fa (LIKE file_actions INCLUDING DEFAULTS);
\copy r_fa FROM 'audit/deleted-file-actions.csv' CSV HEADER
INSERT INTO file_actions SELECT * FROM r_fa ON CONFLICT (id) DO NOTHING;

SELECT 'restored' AS step,
  (SELECT count(*) FROM r_invs) AS inventories,
  (SELECT count(*) FROM r_files) AS files;

COMMIT;
