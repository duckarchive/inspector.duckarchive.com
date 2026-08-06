# 2026-08-06 — ЦДІАК-128-1заг. online-copy linking

Task: link `online_copies` rows parsed from FamilySearch as `ЦДІАК-128-1заг.-*`
to files in inventory `6e8cf222-b07f-48f8-9bc5-26e288e2091f`
(ЦДІАК → fond 128 "Києво-Печерська Свято-Успенська лавра" → inventory 1
"Загальні справи", code `1`, hence "заг." in the FamilySearch code).

## State before

607 `online_copies` rows matched `parsed ILIKE '%ЦДІАК%128%1заг%'`:

- **514** already correctly linked (`file_id` set, pointing into this
  inventory) — done by an earlier sync/migration, no action needed.
- **93** unlinked (`file_id IS NULL`, `inventory_id IS NULL`). All 93 parse to
  a `<справа>ч.<part>` pattern (e.g. `128-1заг.-213ч.11`) referencing 25
  distinct base справа numbers that did not exist as `files` rows in this
  inventory at all (verified: no file with any of these 25 codes existed
  under inventory `6e8cf222…`, before or after prefix match).

## Convention applied

Elsewhere in this DB, a `ч.N` (частина/part) suffix in `parsed` links to a
single base file shared by all its parts (e.g. parsed `128-1-10052а(ч.2)` →
file code `10052А`; parsed `Ф. 37, o. 3, д. 117 ч.1` → file code `117`) — a
multi-part справа is one catalog unit, not one file per part. Confirmed with
the user before applying (see conversation) since it required creating new
catalog rows, not just linking existing ones.

## What ran — `create-and-link.sql`

1. Created 25 `files` rows under inventory `6e8cf222-b07f-48f8-9bc5-26e288e2091f`,
   one per base справа number (27, 30, 88, 213, 223, 250, 287, 305, 306, 344,
   346, 366, 380, 401, 406, 412, 430, 441, 444, 451, 480, 483, 546, 588, 689),
   with `code` + `full_code = ЦДІАК-128-1-<code>` only — title/info/tags left
   NULL, matching how this inventory's other 514 files were bulk-imported.
2. Set `file_id` on all 93 previously-unlinked online copies, matching each
   row's base справа number (extracted from `parsed` via regex
   `128-1заг\.-([0-9]+)ч\.[0-9]+`) to the new file with the same `code`.

Dry-run (`ROLLBACK` instead of `COMMIT`) confirmed 25 files / 93 rows updated
/ 0 remaining unlinked before executing for real. Executed 2026-08-06;
output in `apply-output.log`.

## State after

All 607 `ЦДІАК-128-1заг.` online copies now have `file_id` set, all pointing
into inventory `6e8cf222-b07f-48f8-9bc5-26e288e2091f`. Inventory file count:
514 → 539.

## Files

- `before-unlinked.csv` — the 93 unlinked rows as they were before the change.
- `create-and-link.sql` — the migration (idempotent to re-run only in the
  sense that it's a no-op the second time — it filters on `file_id IS NULL`,
  so re-running after a successful apply inserts nothing and updates nothing).
- `apply-output.log` — captured output from the real run.
- `created-files.csv` — the 25 new file rows (id, code, full_code).
- `linked-copies.csv` — the 93 online_copies rows after linking (id, file_id,
  parsed, url).
- `rollback.sql` — unlinks the 93 copies, then deletes the 25 created files.
  Run as-is; ordering matters (unlink before delete), though `file_id` is
  `ON DELETE CASCADE` so the delete alone would also unlink — this keeps the
  rollback auditable as two explicit steps.
