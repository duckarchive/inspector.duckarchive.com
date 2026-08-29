-- rollback.sql — restore ПЕРІОДИКА file codes, full_codes and titles from
-- pre-state-codes.csv (dumped by 01-codes.sql before any change).
-- Undoes both 01-codes.sql and 02-titles.sql.
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rollback.sql
\set ON_ERROR_STOP on
\timing on

BEGIN;

CREATE TEMP TABLE t_pre (id uuid, old_code text, old_full_code text, old_title text);
\copy t_pre FROM 'pre-state-codes.csv' CSV HEADER

DO $$ BEGIN
  IF (SELECT count(*) FROM t_pre) <> 133453 THEN
    RAISE EXCEPTION 'expected 133453 pre-state rows, got %', (SELECT count(*) FROM t_pre);
  END IF;
END $$;

-- interim pass for the same transient unique-clash reason as in apply
UPDATE files f SET code = '~' || left(md5(f.id::text), 12)
FROM t_pre p WHERE f.id = p.id;

UPDATE files f
SET code = p.old_code, full_code = p.old_full_code, title = p.old_title,
    updated_at = now()
FROM t_pre p WHERE f.id = p.id;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM files f JOIN t_pre p ON p.id = f.id
  WHERE f.code <> p.old_code OR f.full_code <> p.old_full_code OR f.title <> p.old_title;
  IF n > 0 THEN RAISE EXCEPTION '% files not restored', n; END IF;
END $$;

COMMIT;
