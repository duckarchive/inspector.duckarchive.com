# 2026-08-05 — online_copies → catalog linking

One-off data migration linking unlinked `online_copies` rows (both FKs NULL) to the
catalog tree by parsing their `parsed` column. Executed against the `inspector`
database on 2026-08-05. **Result: 55,893 unlinked → 23,294 (32,599 linked, 58%).**

Also created (all with NULL titles, awaiting metadata ingest):
**308 fonds, 378 inventories, 25,899 files.**

## Conventions discovered

- `files.full_code` = `АРХІВ-Фонд-Опис-Справа` with the fond-letter glued (`ДАПО-Р3872-1-1088`),
  while `parsed` often carries `ДАПО-р-3872-1-1088` (dashed, lowercase).
- Latin homoglyphs appear throughout `parsed` (`365a` with Latin *a*, `P 9106`) —
  every match folds `ABCEHIKMOPTXY → АВСЕНІКМОРТХУ` + uppercase on **both** sides.
- Letter suffixes are separate справи: `…-10-а` → file code `10А`.
- FamilySearch `parsed` blob: `АРХІВ-(ref+++volume+++title)` — the code is the first `+++` segment.
- `…-опис`/`…(опис)` in the **code segment** = scan of the inventory register → link
  `inventory_id`, not `file_id`. (`літопис`/`часопис` in titles are false positives.)
- File ranges `фонд-опис-start-end` (end > start) → `inventory_id`.
- ЦДНТА 5/6-segment codes `Р-107-3-36-1-100` → truncate to справа `Р107-3-36`
  (validated 221/221 against editor links). **4-segment ЦДНТА codes are FS internal
  numbering (36/301 agreement) — never bulk-link those.**
- ДАХО `Ф. 31, о. 141, ЕХ163` / `Ekh., 136` → fond 31, опис 141, справа 163
  (ЕХ = единица хранения; validated 1,145/1,145 counting letter suffixes).

## Batches (execution order)

| # | script | linked | target | notes |
|---|--------|--------|--------|-------|
| 1 | `link-dapo.sql` | 128 | file | ДАПО `-р-` normalization; rule validated 17,897/17,897 |
| 2 | `link-rest.sql` | 98 | file | same rule generalized (ДАКрО, wiki, ЦДАМЛМ, …) |
| 3 | `link-all.sql` | 7 | file | + FS blob extraction (ДАХмО) |
| 4 | `create-dahzo-1953.sql` | 256 | file | created fond ДАХеО-Р1953 + опис 1 + 256 files |
| 5 | `link-tier12.sql` | 1,198 | file | 24 inventories + 1,198 files under existing fonds |
| 6 | `link-opys.sql` | 80 | inventory | опис markers; 5 inventories created |
| 7 | `link-ranges.sql` | 5,517 | file+inv | ЦДНТА truncation (5,413) + genuine ranges (104) |
| 8 | `link-tier3.sql` | 24,478 | file | 307 fonds + 348 inventories + 24,187 files created |
| 9 | `link-fstyle.sql` | 697 | file+inv | `Ф. N, о. M, ЕХ…` parser (ДАХО/ДАОО) |
| 10 | `link-fstyle2.sql` | 140 | file+inv | punctuation variants of #9 |

`norm.sql` / `norm2.sql` are the shared normalization helpers (temp functions).

Every batch has:
- `*-map.csv` — exact copy→target audit trail (copy_id, parsed, target, target_id)
- `rollback-*.sql` — full reversal. **Ordering inside matters**: `online_copies.file_id`
  is `ON DELETE CASCADE`, so rollbacks unlink copies BEFORE deleting created
  files/inventories/fonds. Run each rollback file as-is, never reorder.
- `*-skipped.csv` — rows the batch deliberately did not touch, with reasons in the
  session notes.

## Left unlinked (23,294) — needs decisions, not parsing

- ~19,300 FS descriptive blobs (Polish parish names, place text) → human cataloging
- ~3,350 FS `№ NNN` / `Volume N-M` internal refs → need FS-project → fond mapping
- 279 ЦДНТА 4-segment codes → editor review (see warning above)
- ~430 flagged: ЦДІАК `128-4 Вотчинні справи-N` (inventory title in code, four ВОТЧ*
  candidates), ДАКрО empty-fond ingest breakage, ДАЛО `П-15608 Т.1` volume suffixes,
  10 ДАОО multi-part codes (`fstyle2-skipped.csv`)
