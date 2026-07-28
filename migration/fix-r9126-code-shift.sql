-- ============================================================================
-- Fix ДАПО-Р9126 code-shifted anomalous inventory "9126"
-- (inventory_id = 036b4113-511f-4ed7-a41a-a20a26595570)
--
-- Situation: fond Р9126 has an anomalous опис coded "9126" holding 2 shell
-- files (code 8, code 9). Their file_online_copies.parsed values show the
-- shells are actually описи 8 and 9 of the fond, and every copy belongs to a
-- distinct справа:
--   shell "9" → 57 copies parsed Р-9126-9-{142..198}  (опис 9 currently ends at 141)
--   shell "8" → 22 copies parsed Р-9126-8-{184..205}  (опис 8 currently ends at 183)
-- i.e. the copies are the FamilySearch-only continuation of both описи.
--
-- Action: create the missing files in the real описи 8/9, re-point each copy
-- by its parsed code, then delete the 2 shells and the anomalous опис.
-- Shells carry no years/authors/actions/info/tags — only the copies.
-- Title for created files = modal FS-derived sibling title.
-- Audit: mig_r9126_shift_fix (kept).
-- ============================================================================

BEGIN;

-- 1. Mapping: every copy of the two shells → target (опис, справа) from parsed
CREATE TABLE mig_r9126_shift_fix AS
SELECT
  foc.id            AS copy_id,
  foc.file_id       AS old_file_id,
  substring(foc.parsed from 'Р-9126-(\d+)-\d+\+\+\+')       AS target_inv_code,
  substring(foc.parsed from 'Р-9126-\d+-(\d+)\+\+\+')       AS target_file_code,
  foc.parsed,
  NULL::uuid        AS new_file_id
FROM file_online_copies foc
WHERE foc.file_id IN (
  SELECT id FROM files WHERE inventory_id = '036b4113-511f-4ed7-a41a-a20a26595570'
);

-- 2. Sanity checks
DO $$
DECLARE
  n_total int; n_distinct int; n_bad_inv int; n_collide int;
BEGIN
  SELECT count(*), count(DISTINCT (target_inv_code, target_file_code))
    INTO n_total, n_distinct FROM mig_r9126_shift_fix;
  IF n_total <> 79 OR n_distinct <> 79 THEN
    RAISE EXCEPTION 'expected 79 copies with 79 distinct targets, got % / %', n_total, n_distinct;
  END IF;

  SELECT count(*) INTO n_bad_inv FROM mig_r9126_shift_fix
  WHERE target_inv_code NOT IN ('8','9') OR target_file_code IS NULL;
  IF n_bad_inv <> 0 THEN
    RAISE EXCEPTION '% copies with unparseable/unexpected target', n_bad_inv;
  END IF;

  -- target codes must not exist yet in the real описи
  SELECT count(*) INTO n_collide
  FROM mig_r9126_shift_fix m
  JOIN inventories i ON i.fond_id = '26a87352-5e47-4143-94cf-32f47f49ce03'
                    AND i.code = m.target_inv_code
  JOIN files f ON f.inventory_id = i.id AND f.code = m.target_file_code;
  IF n_collide <> 0 THEN
    RAISE EXCEPTION '% target file codes already exist', n_collide;
  END IF;
END $$;

-- 3. Create the missing files (updated_at stays NULL = raw-SQL insert convention)
WITH targets AS (
  SELECT DISTINCT m.target_inv_code, m.target_file_code, i.id AS inventory_id
  FROM mig_r9126_shift_fix m
  JOIN inventories i ON i.fond_id = '26a87352-5e47-4143-94cf-32f47f49ce03'
                    AND i.code = m.target_inv_code
),
ins AS (
  INSERT INTO files (code, full_code, title, inventory_id)
  SELECT
    t.target_file_code,
    'ДАПО-Р9126-' || t.target_inv_code || '-' || t.target_file_code,
    'Metrical Books and Clergy Records, Poltava',
    t.inventory_id
  FROM targets t
  RETURNING id, code, inventory_id
)
UPDATE mig_r9126_shift_fix m
SET new_file_id = ins.id
FROM ins
JOIN inventories i ON i.id = ins.inventory_id
WHERE m.target_inv_code = i.code AND m.target_file_code = ins.code;

DO $$
DECLARE n_unmapped int;
BEGIN
  SELECT count(*) INTO n_unmapped FROM mig_r9126_shift_fix WHERE new_file_id IS NULL;
  IF n_unmapped <> 0 THEN
    RAISE EXCEPTION '% copies left without a new file', n_unmapped;
  END IF;
END $$;

-- 4. Re-point the copies (MUST precede shell deletion: fk is ON DELETE CASCADE)
UPDATE file_online_copies foc
SET file_id = m.new_file_id
FROM mig_r9126_shift_fix m
WHERE foc.id = m.copy_id;

-- 5. Drop the shells and the anomalous опис
DELETE FROM files WHERE inventory_id = '036b4113-511f-4ed7-a41a-a20a26595570';
DELETE FROM inventories WHERE id = '036b4113-511f-4ed7-a41a-a20a26595570';

-- 6. Verify
DO $$
DECLARE n_files int; n_copies int; n_dup int;
BEGIN
  SELECT count(*) INTO n_files FROM files f
  JOIN inventories i ON i.id = f.inventory_id
  WHERE i.fond_id = '26a87352-5e47-4143-94cf-32f47f49ce03' AND i.code IN ('8','9');
  IF n_files <> 183 + 22 + 141 + 57 THEN
    RAISE EXCEPTION 'описи 8+9 file count = %, expected 403', n_files;
  END IF;

  SELECT count(*) INTO n_copies FROM file_online_copies foc
  JOIN mig_r9126_shift_fix m ON m.copy_id = foc.id
  WHERE foc.file_id = m.new_file_id;
  IF n_copies <> 79 THEN
    RAISE EXCEPTION 'only % of 79 copies re-pointed', n_copies;
  END IF;

  SELECT count(*) INTO n_dup FROM (
    SELECT full_code FROM files GROUP BY full_code HAVING count(*) > 1
  ) d;
  IF n_dup <> 0 THEN
    RAISE EXCEPTION '% duplicate full_codes after fix', n_dup;
  END IF;
END $$;

COMMIT;
