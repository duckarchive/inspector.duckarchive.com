-- НМІУДСВ (full archive, 4,840 online_copies / 4,813 files) — write OCR results
-- into files.title + files.info. Source: nmiudsv-full-archive-ocr.csv (Gemini
-- 2.5 Flash over the first 2 FamilySearch images per DGS; see README.md).
--
-- Rules:
--   - title: ocr_title, EXCEPT files with a human-authored title are preserved
--     (title IS NOT NULL AND updated_at IS NOT NULL = the 24 manually-titled
--     files in inventory 5499; bulk-import placeholders have updated_at NULL).
--   - info: ocr_description + an [OCR ...] provenance marker with confidence,
--     written for every matched file (info was NULL archive-wide before this).
--   - rows with ocr_error or empty ocr_title are skipped (2 rows, 1 DGS);
--     the 19 file-unlinked copies are skipped; where several copies map to one
--     file, the highest-confidence row wins (high > medium > low).
--   - file_years intentionally NOT touched in this pass — year data stays in
--     the CSV for a future, separately-reviewed pass.
--
-- Run from this directory:  psql "$DB" -f apply-title-info-full.sql
-- Pre-state backup (for rollback-title-info-full.sql): pre-state-title-info.csv

CREATE TEMP TABLE stg_ocr (
  online_copy_id uuid, url text, parsed text, linked_full_code text,
  ocr_title text, ocr_description text, ocr_start_year text, ocr_end_year text,
  ocr_institution text, ocr_full_title_raw text, ocr_sprava_number text,
  ocr_raw_date_text text, ocr_confidence text, ocr_notes text,
  ocr_images_used text, ocr_error text, dgs text
);
\copy stg_ocr FROM 'nmiudsv-full-archive-ocr.csv' CSV HEADER

BEGIN;

WITH ranked AS (
  SELECT
    oc.file_id,
    trim(s.ocr_title) AS ocr_title,
    concat_ws(' | ',
      NULLIF(trim(s.ocr_description), ''),
      '[OCR gemini-2.5-flash, впевненість: ' ||
        CASE s.ocr_confidence
          WHEN 'high' THEN 'висока'
          WHEN 'medium' THEN 'середня'
          WHEN 'low' THEN 'низька'
        END || ']'
    ) AS info,
    row_number() OVER (
      PARTITION BY oc.file_id
      ORDER BY
        CASE s.ocr_confidence WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        s.online_copy_id
    ) AS rn
  FROM stg_ocr s
  JOIN online_copies oc ON oc.id = s.online_copy_id
  WHERE oc.file_id IS NOT NULL
    AND coalesce(s.ocr_error, '') = ''
    AND coalesce(trim(s.ocr_title), '') <> ''
)
UPDATE files f
SET
  title = CASE
    WHEN f.title IS NOT NULL AND f.updated_at IS NOT NULL THEN f.title
    ELSE r.ocr_title
  END,
  info = r.info,
  updated_at = now()
FROM ranked r
WHERE r.rn = 1 AND f.id = r.file_id;

-- verification: expect 4811 with info; title coverage 4811 (+2 uncovered by
-- the failed DGS keep whatever they had); 24 titles unchanged vs pre-state.
SELECT
  count(*) AS total_files,
  count(*) FILTER (WHERE f.title IS NOT NULL) AS with_title,
  count(*) FILTER (WHERE f.info IS NOT NULL) AS with_info
FROM files f
JOIN inventories i ON i.id = f.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE a.code = 'НМІУДСВ';

-- the 24 manually-titled files must be byte-identical to the pre-state CSV
SELECT f.full_code, left(f.title, 60) AS preserved_title
FROM files f
WHERE f.inventory_id = 'c2a8993d-c149-4a4d-b5b0-b2cbf075427c'
  AND f.code::int <= 24
ORDER BY f.code::int;

COMMIT;
