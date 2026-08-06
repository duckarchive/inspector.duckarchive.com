# 2026-08-06 — ДАОО bulk online-copy linking

Follow-up to the fond-1008 one-off: linked the remaining unlinked ДАОО
FamilySearch `online_copies`. **4,079 unlinked → 23 (4,056 linked: 3,974
to files, 82 to inventories).** Created **29 fonds, 83 inventories,
3,315 files** (NULL titles, matching bulk-imported ДАОО rows).

## Parse families handled (first `+++` segment of `ДАОО-(…)`)

| family | example | target |
|---|---|---|
| фонд_опис_справа triple | `497_1_16`, `42_3_10082` | file |
| фонд_опис pair | `1009_1`, `Р8085_20` | inventory |
| Р-prefix folding | `Р_36_1_159`, `Р-59_1_93` → fond `Р36`/`Р59` | file |
| «л» опис (`1Л`) | `5-1-л-148`, `164_1_л_15`, pair `8-1-л` | file / inventory |
| частина `_чN` / ` ч.N` | `1_170_14_ч1`, `37-3-210 ч.1` → base справа | file |
| `_duplicate` suffix | `1_166_55_duplicate` → same file as original | file |
| 4-segment truncate | `621_1_4_1` → справа `4` (ЦДНТА-style rule) | file |
| f-style | `Ф. 37, on. 2, д. 59-a-2` → `37-2-59А` | file |

Normalization (same as prior migrations): uppercase + Latin homoglyph fold
`ABCEHIKMOPTXY → АВСЕНІКМОРТХУ` (letter suffixes `13a → 13А`), suffix strip
BEFORE folding (so `duplicate` doesn't get half-translated), `Р[-_]` → `Р`,
stray `-_` → `_`.

**Precision pre-check:** the 22,811 already-linked ДАОО triples map to their
file's `full_code` under this rule at 99.9% — the 30 "mismatches" were all
the Latin-а homoglyph the fold fixes. `1Л` inventories verified to already
exist for fonds 5/7/8/164.

## Left manual — `skipped.csv` (23)

- 8 × junk `ДАОО-(---+++---+++)` — nothing to parse
- 14 × `1_173_1_чN(YYYY)` / `1_174_1_чN(YYYY)` — same ч-number repeats with
  different years, so справа numbering is per-year and the true справа is
  unknown → editor review
- 1 × `Р8085_21_242_1(Rework)` — FS internal annotation, unclear target

## Run

Dry-run (COMMIT→ROLLBACK) matched projections exactly (29/83/3315 created,
3,974+82 linked, 23 left) before the real run. Executed 2026-08-06; output
in `apply-output.log`. The `\copy` audit exports at the end of the script
error harmlessly in dry-runs (ROLLBACK drops the temp tables).

## Files

- `before-unlinked.csv` — all 4,079 unlinked rows before the change
- `create-and-link.sql` — the migration (parse → create missing → link);
  re-runs are no-ops (filters on both FKs NULL)
- `apply-output.log` — real-run output
- `created-fonds.csv` / `created-invs.csv` / `created-files.csv` — created ids
- `linked-copies.csv` — copy → (fond, опис, справа, file_id/inventory_id) audit
- `skipped.csv` — the 23 rows left unlinked, see above
- `rollback.sql` — run from repo root; unlinks all touched copies, then
  deletes only created rows, child-first (files → inventories → fonds)
