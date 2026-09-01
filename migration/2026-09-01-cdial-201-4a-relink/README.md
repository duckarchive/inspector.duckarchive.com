# 2026-09-01 — relink ЦДІАЛ-201-4А online_copies to their specific files

User report: a lot of the online_copies linked to inventory `ЦДІАЛ/201/4А`
("Метричні книги Галичини", fond 201) look wrong. Investigation found 148
FamilySearch/wikisource copies linked at the **inventory** level, none of
them actually mis-linked — they were parked there by the existing autolink
convention ("range ref → inventory_id", see `migration/2026-08-05-online-copies-linking/README.md`)
because their stored `parsed` text names a *range* of files covered by one
microfilm reel, not a single file.

## What the range actually is

FamilySearch `online_copies.url` for this opis is always
`…?imageGroupNumbers=<DGS>` (root, one film) or `…?imageGroupNumbers=<DGS>_<seq>_<imgId>`
(specific, one item within the film) — same two shapes as in
`migration/2026-09-01-fs-root-dgs-dedup/README.md`. For a root-form DGS whose `parsed` names N files, the
whole roll is one indivisible search result on FamilySearch itself
("Results (1)") — there is genuinely no single file to relink to, and the
inventory-level link is correct as-is (confirmed by visiting several of
these URLs directly: `004932751`, `007789865`, `004932934`, `004932939` all
show "Results (1)" despite listing 6-10 files in their ref text).

For a DGS that our scraper *did* split into several `_seq_` rows, FamilySearch's
own search-results page (`imageGroupNumbers=<DGS>`, visited while logged in)
shows one row per real catalog item — "Item N of M" — each with its own date
range and sometimes a direct file code. That per-item breakdown is what lets
individual copies be pinned to individual files; it isn't present anywhere in
our own `parsed` text (identical across every `_seq_` row of the same reel).

## Matching method

For each multi-item film, fetched `https://www.familysearch.org/en/records/images/search-results?imageGroupNumbers=<DGS>`
and matched "Item N"'s date range (and record type, e.g. "Religious Death
Records" ↔ file title "(смерті)") against this inventory's file titles —
titles carry their own year range and often a birth/death/marriage marker in
Ukrainian. `file_years` was **not** trusted as the match key: it disagrees
with its own file's title on several rows (file 2006: title states
1844-1866, `file_years` says 1938; file 2258: title states 1811-1834,
`file_years` says 1785-1800 — a pre-existing data quality issue, not caused
by this migration, worth a separate look). "Item N" is assumed to correspond
to the online_copy whose url ends `_<3-digit N>_<imgId>` — validated by every
film below resolving to a clean, non-conflicting 1:1 assignment.

## Scope: 66 of 148 relinked, 82 left as-is

| DGS film | copies relinked | how |
|---|---|---|
| 004933106 | 12 | FamilySearch gives the file code **directly** per item (`201-4а-2160`…`2171`) |
| 004932970 | 13 | year + record-type match, files 2006-2018 |
| 004933242 | 11 | year + type match, files 3826(cont)-3836 |
| 004933300 | 12 | year + type match, files 4246(cont)-4258 (seq 006 / file 4251 has no stored row) |
| 004932891 | 7 | year match, files 1352(cont)-1359 (seq 001/008 have no stored row) |
| 004933386 | 8 | year + type match, files 4985(cont)-4992 |
| 004933147 | 3 of 10 | only items 1-3 have a direct code (3187-3189); items 4-10 left unresolved |

**82 copies deliberately left at the inventory level:**
- ~39 root-form DGS covering a genuine multi-file range with only one
  FamilySearch search result — nothing more precise exists (see above).
- 2 pure opis-level refs (no file number at all).
- `004932984` (4 rows) — FamilySearch's "Place" label disagreed with the
  catalog village name for these items; not confident enough to auto-link.
- `007707393` (9 rows) — no справа number in `parsed` at all; would need
  matching by village name instead of year (not attempted).
- Remainder of `004933147` (7 rows), all of `004933043` (9) and `004933133`
  (12) — same year/type technique should work but wasn't finished.

User decision 2026-09-01: ship the 66 high-confidence rows now, leave the
other 82 (including the ~40 that could plausibly be resolved with more
work) for a later pass.

## Scripts

```sh
psql … -f 01-preview.sql   # read-only, writes audit/preview.csv
psql … -f 02-execute.sql   # DESTRUCTIVE: relink the 66 (no deletes — actions untouched)
psql … -f rollback.sql     # undo, from audit/before.csv
```

`00-mapping.sql` is the hand-built (DGS, seq, file_code) table, `\i`-included
by both.

## Status

- [x] 2026-09-01 — preview: 66/66 mapping rows matched a stored online_copy,
  0 collisions, 0 pending actions on the affected rows. Audit: `audit/preview.csv`.
- [x] 2026-09-01 — `02-execute.sql` run: **66 copies relinked** from inventory
  to file, 0 left on the inventory among the mapped set, 0 mismatched.
  Backup: `audit/before.csv` (full row snapshot, for `rollback.sql`).
- [x] Post-check: inventory-linked FS/wiki copies for this opis 148 → 82.
