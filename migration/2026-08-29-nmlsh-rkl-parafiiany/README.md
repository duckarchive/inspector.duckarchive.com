# 2026-08-29 — Списки парафіян греко-католицької церкви (НМЛШ + ЦДІАЛ 201)

Import of the user-curated spreadsheet `source.csv` (Списки парафіян
греко-католицької церкви — Аркуш1), 348 rows.

## What was done

1. **New archive `НМЛШ`** — «Національний музей у Львові ім. А.Шептицького»,
   with fond `РКЛ` (no title) → опис `1` → **273 files** from `НМЛ,РКЛ-XXX`
   codes (РКЛ-260, РКЛ-1752…РКЛ-2096).
2. **ЦДІАЛ ф. 201** (existing archive/fond): 75 rows across existing описи
   `1`, `1А`, `4`, `4А` (CSV lowercase `1а`/`4а` normalized to uppercase).
   **71 files created**, 4 already existed (201-1-22, 201-4А-187,
   201-4А-3212, 201-4А-5580) — only empty `info` was filled on those,
   titles/years left untouched.
3. `file_years` from the Роки column (286 inserted; `не вказано`/empty
   skipped; only РКЛ-260 is a range, 1818-1835).

## Field mapping

- `Назва справи` → `files.title` (`невідомо` → NULL; only 201-4-887).
- `files.info` assembled from: `Населений пункт / деканат: X` (skipped when
  already contained in the title, or junk `?????`), `Аркушів: N` (skipped
  when `невідомо`/`не вказано`), deanery-composition text (the multiline part
  of the place column, `todo` stubs skipped), `Примітки: …`.
- `full_code` = `АРХІВ-ФОНД-ОПИС-СПРАВА`.

## Files

- `derive.py` — source.csv → staging.csv (rerunnable).
- `01-apply.sql` — the import, applied 2026-08-29. Prints step counts and
  writes `created-files.csv` (the 344 created full_codes) for rollback.
- `rollback-01.sql` — deletes created files/years (guarded against attached
  online copies), NULLs the 4 enriched infos, drops the НМЛШ tree.

Post-apply hotfix (already included in derive.py now): removed bogus
`Аркушів: не вказано` lines from 201-1А-7 and 201-4-887 infos.
