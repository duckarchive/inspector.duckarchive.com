-- ПЕРІОДИКА / фонд 2 «Єпархіальні Відомості»
-- Inventories (10 eparchies) + files (14 065 issues) + online copies,
-- from uk.wikisource.org/wiki/Архів:Єпархіальні_Відомості
--
-- Run with:  psql "$PGURL" -v ON_ERROR_STOP=1 -f migration.sql
-- Ends in ROLLBACK by default — flip the last line to COMMIT to apply.

\set fond_id '8775ebfa-04ab-44e3-bea9-137704f39b06'
\set wiki_res '12766f78-3d8b-4bfe-bbea-682267a9e3e6'

BEGIN;

-- ── guards: the fond exists and is still empty ────────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM fonds f JOIN archives a ON a.id = f.archive_id
   WHERE f.id = '8775ebfa-04ab-44e3-bea9-137704f39b06'
     AND a.code = 'ПЕРІОДИКА' AND f.code = '2';
  IF n <> 1 THEN RAISE EXCEPTION 'fond ПЕРІОДИКА-2 not found by id'; END IF;

  SELECT count(*) INTO n FROM inventories
   WHERE fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  IF n <> 0 THEN RAISE EXCEPTION 'fond ПЕРІОДИКА-2 already has % inventories', n; END IF;

  SELECT count(*) INTO n FROM resources
   WHERE id = '12766f78-3d8b-4bfe-bbea-682267a9e3e6' AND code = 'wiki';
  IF n <> 1 THEN RAISE EXCEPTION 'wiki resource not found by id'; END IF;
END $$;

-- ── staging ──────────────────────────────────────────────────────────────
CREATE TEMP TABLE s_inv (code text, title text, start_year int, end_year int) ON COMMIT DROP;
CREATE TEMP TABLE s_file (inv_code text, code text, full_code text, title text, year int) ON COMMIT DROP;
CREATE TEMP TABLE s_ioc (inv_code text, url text, parsed text) ON COMMIT DROP;
CREATE TEMP TABLE s_foc (inv_code text, file_code text, url text, parsed text) ON COMMIT DROP;

\copy s_inv  FROM '01-inventories.csv'      WITH (FORMAT csv, HEADER true)
\copy s_file FROM '02-files.csv'            WITH (FORMAT csv, HEADER true)
\copy s_ioc  FROM '03-inventory-copies.csv' WITH (FORMAT csv, HEADER true)
\copy s_foc  FROM '04-file-copies.csv'      WITH (FORMAT csv, HEADER true)

DO $$
DECLARE i int; f int; a int; b int;
BEGIN
  SELECT count(*) INTO i FROM s_inv;  SELECT count(*) INTO f FROM s_file;
  SELECT count(*) INTO a FROM s_ioc;  SELECT count(*) INTO b FROM s_foc;
  IF (i,f,a,b) <> (10,14065,10,7853)
    THEN RAISE EXCEPTION 'unexpected payload sizes: % % % %', i,f,a,b; END IF;
END $$;

-- ── inventories ──────────────────────────────────────────────────────────
INSERT INTO inventories (id, code, title, fond_id, updated_at)
SELECT gen_random_uuid(), code, title,
       '8775ebfa-04ab-44e3-bea9-137704f39b06', now()
  FROM s_inv;

INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT i.id, s.start_year, s.end_year
  FROM s_inv s
  JOIN inventories i ON i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06'
                    AND i.code = s.code;

-- index page of each eparchy, attached to its inventory
INSERT INTO online_copies (id, resource_id, inventory_id, url, parsed, source_key, availability)
SELECT gen_random_uuid(), '12766f78-3d8b-4bfe-bbea-682267a9e3e6', i.id,
       s.url, s.parsed, s.parsed, 'PUBLIC'
  FROM s_ioc s
  JOIN inventories i ON i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06'
                    AND i.code = s.inv_code;

-- ── files ────────────────────────────────────────────────────────────────
INSERT INTO files (id, code, full_code, title, inventory_id, updated_at)
SELECT gen_random_uuid(), s.code, s.full_code, s.title, i.id, now()
  FROM s_file s
  JOIN inventories i ON i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06'
                    AND i.code = s.inv_code;

INSERT INTO file_years (file_id, start_year, end_year)
SELECT f.id, s.year, s.year
  FROM s_file s
  JOIN files f ON f.full_code = s.full_code;

-- Commons PDF of each scanned issue (3 issues carry a second «додаток» scan)
INSERT INTO online_copies (id, resource_id, file_id, url, parsed, source_key, availability)
SELECT gen_random_uuid(), '12766f78-3d8b-4bfe-bbea-682267a9e3e6', f.id,
       s.url, s.parsed, s.parsed, 'PUBLIC'
  FROM s_foc s
  JOIN inventories i ON i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06'
                    AND i.code = s.inv_code
  JOIN files f ON f.inventory_id = i.id AND f.code = s.file_code;

-- ── post-conditions ──────────────────────────────────────────────────────
DO $$
DECLARE i int; f int; fy int; ioc int; foc int;
BEGIN
  SELECT count(*) INTO i FROM inventories
   WHERE fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  SELECT count(*) INTO f FROM files fl JOIN inventories iv ON iv.id = fl.inventory_id
   WHERE iv.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  SELECT count(*) INTO fy FROM file_years y JOIN files fl ON fl.id = y.file_id
   JOIN inventories iv ON iv.id = fl.inventory_id
   WHERE iv.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  SELECT count(*) INTO ioc FROM online_copies oc JOIN inventories iv ON iv.id = oc.inventory_id
   WHERE iv.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  SELECT count(*) INTO foc FROM online_copies oc JOIN files fl ON fl.id = oc.file_id
   JOIN inventories iv ON iv.id = fl.inventory_id
   WHERE iv.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
  RAISE NOTICE 'inventories=% files=% file_years=% inv_copies=% file_copies=%', i,f,fy,ioc,foc;
  IF (i,f,fy,ioc,foc) <> (10,14065,14065,10,7853)
    THEN RAISE EXCEPTION 'post-condition mismatch'; END IF;
END $$;

COMMIT;  -- applied 2026-09-08; undo with rollback.sql
