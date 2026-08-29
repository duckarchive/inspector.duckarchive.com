# 2026-08-29 — ПЕРІОДИКА: edition-based file codes + newspaper-name titles

Catalog-wide rework of all **133,453 files** in the ПЕРІОДИКА archive
(712 fonds = newspapers, 2,077 inventories = years). Applied 2026-08-29.

## 01-codes.sql (committed)

Old codes were online-copy scrape ids (`23050`). New code = edition number
extracted from the title `№ <номер>, DD.MM.YYYY`; full_code rebuilt as
`ПЕРІОДИКА-<фонд>-<рік>-<номер>`.

- **130,258** plain edition codes (`№ 25, 04.02.1932` → `25`; compound kept
  verbatim: `25-26`, `1-а`, `2504 екстр. вип.`).
- **3,184** collide within their year (same №: 815 groups with different
  dates + 738 groups of duplicate imports of the same issue — NOT merged,
  per decision): Cyrillic letter postfix sorted by issue date, then by old
  code — `64А`, `64Б`, … (letters А..П, max group size 10).
- **11** date-only titles (Lemberger Zeitung 1942 ×9, Львівські вісті
  1941/1942 ×1+1): `б/н-1`, `б/н-2`, … incremental by date within the year.
  (Bare `1`, `2`… would collide with real edition numbers in those years.)
- Two-phase update (interim `~md5` codes) to dodge transient unique-index
  clashes between new codes and other rows' not-yet-updated old ids.
- `online_copies` untouched: links stay by `file_id`; `parsed` still holds
  the old id-based string as scrape provenance.

## 02-titles.sql (committed)

Every file title prefixed with its fond (newspaper) title, matching the
inventory style: `№ 25, 04.02.1932` → `Діло, № 25, 04.02.1932`.
Idempotent (skips already-prefixed). 133,453 updated.

## Rollback

`rollback.sql` restores code/full_code/title for all files from
`pre-state-codes.csv` (dumped before any change). Undoes both scripts.
`code-map.csv` = old_full_code → new_full_code for all files.

## Ops notes

- Each full UPDATE pass takes ~6-8 min (GIN trgm indexes on
  full_code/title). Total apply ≈ 20 min.
- A killed psql client leaves the server backend running its statement in
  a doomed transaction — `pg_terminate_backend` it before retrying.
