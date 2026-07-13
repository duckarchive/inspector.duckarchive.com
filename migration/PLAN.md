# Migration Plan: fund→description→case ⇒ fond→inventory→file

> **Correction pending (2026-07-13)**: Phase 3 step 3 ("Import old-only copies") was a
> misunderstanding — legacy copies must NOT be copied into the new tables, only used as a
> url→instance map to attach scraped rows. Cleanup plan: `migration/FIX-COPIES.md`.

## How to run

```bash
pnpm tsx migration/src/migrate.ts --list            # archives with legacy data
pnpm tsx migration/src/migrate.ts ДАХмО --dry-run   # full run + reports, then ROLLBACK
pnpm tsx migration/src/migrate.ts ДАХмО             # real run (auto-rollback if verification fails)
```

- DB: local socket `inspector_local` (override with `MIGRATION_DATABASE_URL`; `.env DATABASE_URL` is deliberately ignored).
- One archive = one transaction. Reports land in `migration/out/<ARCHIVE>/` (`report.md`, `anomalies.csv`, `conflicts.csv`; `.dry-run` suffixed when rolled back).
- Source code: `migration/src/` — `normalize.ts` (canonicalization rules), `entities.ts` (phase 2), `copies.ts` (phase 3), `verify.ts` (phase 4), `migrate.ts` (CLI).

After all archives are committed:
```bash
psql -d inspector_local -f migration/reconcile.sql   # global legacy-vs-new counts + integrity
psql -d inspector_local -f migration/finalize.sql    # TRUNCATE legacy tables (defaults to ROLLBACK; edit to COMMIT)
```

## Current state (investigated 2026-07-06, DB: `inspector_local`)

### Legacy structure (source)
| Table | Rows | Related |
|---|---|---|
| `funds` | 55,076 | `fund_years` (40,606) |
| `descriptions` | 94,735 | `description_years` (30,929), `description_online_copies` (24,612) |
| `cases` | 2,957,858 | `case_years` (1.75M), `case_authors` (57,936), `case_locations` (102), `case_online_copies` (3.28M) |

### New structure (target)
| Table | Rows | Notes |
|---|---|---|
| `fonds` | 4,540 | ДАДнО (4,539; 3,865 match legacy fund codes) + ЦДІАК (1: fond `442`) |
| `inventories` | 5,939 | ДАДнО (5,869) + ЦДІАК (70). Uses **v2 codes** (`ДОД` full form, lowercase `ос`/`пош`) |
| `files` | 41,287 | ЦДІАК only (fond 442); only 8,781 match legacy `cases.full_code` — rest is a fresh scrape |
| `file_online_copies` | 2,451,052 | **ALL have `file_id = NULL`** — nothing matched yet. `parsed` holds a full_code-like string for every archive |
| `inventory_online_copies` | 18,838 | same pattern, nullable `inventory_id` + `parsed` |

Key structural difference in online copies:
- legacy `case_online_copies`: PK `(resource_id, case_id, url)` — always attached to a case
- new `file_online_copies`: own `id`, **nullable** `file_id`, `parsed` text, UNIQUE `(resource_id, file_id, parsed, url)` — copies can exist unattached

### Code format: parseCode v1 vs v2 (`utils/src/parse.ts`)
- v1 (legacy tables): `ДОП|ДОД→Д`, `ТОМ→Т`, `ЧАСТ*→Ч` (shortened)
- v2 (new tables): `→ДОД`, `→ТОМ`, `→ЧАСТ` (full forms)

## Global findings

1. **Т/ТОМ duplicates are rare and fully enumerated** — 32 merge groups across the whole DB:
   - 9 description groups in ЦДІАК fund 486 (`1Т1`+`1ТОМ1` … `3Т2`+`3ТОМ2`)
   - 12 description groups in ЦДАВО fund 8 (`1н`+`1Н` … `12н`+`12Н` — lowercase-only dupes)
   - 7 case groups in ДАХмО-226-79 (`5146Т1`+`5146ТОМ1`, `5172Т1..5`+`5172ТОМ1..5`)
   - 4 case pairs differing only in `н`/`Н` (ЦДАВО-2-15: 803, 906; ЦДАМЛМ-1146-1-20; ЦДІАК-1350-1-17)
   - Verified: conflicting children carry **identical titles**, different scrape timestamps (2024 = ТОМ variant, 2026 = Т variant)
2. **Junk/service codes: exactly 100 rows DB-wide** (see `ARCHIVES.md`), e.g. `НЕВІДОМИЙ`, `ВИДАННЯ`, `БІБЛ`, `ТЕСТ`, `ФИЛЕС` (×6), `-17781` (dash prefix, ДАЛО), `ЦПРАВА13` (typo), `181ДРУГАСПРАВА`, `Ф127ОП191ПДФ`.
3. **Fund-code letter prefixes are legit and must be preserved**: `Р#` (31,235), `П#` (7,119), `Н#` (834), `КМФ#` (54), `У#` (48), `ФП#`, `ТФ#`, and rare suffix forms `#С`, `#СЧ`, `Р#Ц`.
4. **Zero-padded codes**: 1 fund, 8 descriptions, 48 cases (strip leading zeros = parseCode behavior).
5. **URL ambiguity**: 42,739 URLs map to >1 legacy case → matching MUST use `url + full_code`, never url alone. 1.64M URLs overlap between old and new copy tables.
6. FamilySearch `parsed` values use composite format `ДААРК-(1-1+++1-1+++1-1_1884-1885)` — needs its own parser; ARCHIUM/WIKIPEDIA parsed values are plain `АРХІВ-Ф-ОП-СПР`.

## Phases

Process **one archive at a time**; each archive runs the same pipeline (Phases 1–4) inside a transaction, with dry-run mode producing reports only.

### Phase 0 — Tooling
- `migration/` TS scripts (pg client), CLI: `migrate <ARCHIVE_CODE> [--dry-run]`
- Per-archive output: `migration/out/<ARCHIVE>/report.md` (stats), `anomalies.csv` (sequence gaps, junk codes), `conflicts.csv` (merge conflicts for manual review)
- Persistent id-mapping tables (or in-run maps): `old case_id → new file_id`, etc.

### Phase 1 — Normalize & detect anomalies (read-only pass)
For each level (fund/description/case):
1. `normalize(code)`: trim, upper-case, strip non-alphanumerics, latin→cyrillic (parseCode base), strip leading zeros.
2. Canonicalize volume markers **v1→v2**: `(\d)Т(\d)` → `$1ТОМ$2` (Т followed by digit = volume; bare trailing `Т` stays — it's an alphabet postfix like `А`/`Б`/`В`). Same question applies to `Д`/`ДОД` and `Ч`/`ЧАСТ` — see open questions.
3. Sequence check per parent: extract numeric base, sort, report gaps and >N jumps (informational anomaly, not blocking).
4. Collision check per parent: group by normalized code → merge groups (the 32 known + any new ones the normalization surfaces).
5. Junk codes → `anomalies.csv` with proposed action (migrate as-is / rename / skip).

### Phase 2 — Entity migration (per archive)
1. **Fonds**: upsert by `(archive_id, normalized code)`. ДАДнО: 3,865 existing fonds match legacy codes → reuse; fill empty title/info from legacy; 674 new-only fonds stay untouched.
2. **Inventories**: upsert by `(fond_id, normalized code)`. Merge groups (Т/ТОМ, н/Н): create ONE inventory with canonical v2 code; longest/newest title wins; union `description_years` and `description_online_copies`.
3. **Files**: insert from cases with recomputed `full_code = АРХІВ-ФОНД-ОПИС-СПРАВА` (all normalized). For merged parents, dedupe children by normalized code:
   - same code + same title → single file (keep newest `updated_at`)
   - same code + different title → write both to `conflicts.csv`, migrate the newest, flag file with tag `migration-conflict`
   - ЦДІАК: 41,287 files already exist → upsert by `(inventory_id, code)`; fill title/info if empty; never duplicate.
4. **Satellites**: `fund_years→fond_years`, `description_years→inventory_years`, `case_years→file_years`, `case_authors→file_authors`, `case_locations→file_locations` — straight copies through the id maps, deduped by target PKs.

### Phase 3 — Online copies (per archive)
New copy tables are **scraper-owned**: legacy copies are only ever used as a `url`→instance map
to attach existing scraped rows, never copied in as new rows (corrected 2026-07-13, see
`migration/FIX-COPIES.md`). Rule: **match by `url`, disambiguate/attach by `full_code`**:
1. Build map `old_url+old_full_code → new_file_id` from Phase-2 id mapping (case→file).
2. **Attach existing new rows**: `file_online_copies.file_id = map[url]` where a legacy copy with the same `url` exists and its case is mapped (i.e. `full_code` agrees through the mapping). On the 42.7k ambiguous URLs the full_code side of the map picks the right file.
3. **Legacy-only copies** (urls absent from `file_online_copies`): counted (`copies_legacy_only_no_scrape`) for visibility, **not** inserted — a legacy copy with no scraped counterpart just means the scraper hasn't found that page yet.
4. **Leftover new rows** (`file_id` still NULL): match `parsed` → normalized file `full_code` (exact after v1/v2 canonicalization). FamilySearch composites get a dedicated parser (split `(a+++b+++c_years)` variants) — leftovers stay NULL for the next scraper run to resolve.
5. Same steps for `description_online_copies` → `inventory_online_copies`.

### Phase 4 — Verification (per archive)
- Row-count reconciliation: legacy vs migrated (+merged −skipped = exact balance).
- No orphan `file_online_copies.file_id`, no full_code duplicates inside archive.
- Spot-check: N random cases → file pages render in the app.
- Only then move to the next archive.

## Suggested archive order

1. **Pilot (tiny/clean)**: ГДАМВС (1 case), ГДАСЗРУ (1), ДАС (2), ГДАСБУ (104) — validates pipeline end-to-end.
2. **Special-case dry runs**: ДАДнО (existing fonds/inventories, 0 files — tests upsert), ЦДІАК (existing files + most anomalies — tests file upsert + Т/ТОМ desc merge), ДАХмО (case-level ТОМ merge), ЦДАВО (н/Н merges).
3. **Bulk by size ascending**: remaining 30 archives (see ARCHIVES.md), largest last (ДАПО 492k, ДАКО 287k, ЦДІАК 284k cases).

## Decisions (confirmed 2026-07-06)

1. **Т→ТОМ**: convert every `(\d)Т(\d)` → `$1ТОМ$2` (~34k cases incl. ЦДАГО's 31,324). `file_online_copies.parsed` uses the SHORT form (949 `Т#` vs 3 `ТОМ#`) → Phase-3 parsed-matching normalizes both sides to a canonical compare key.
2. **Junk codes**: skip only `ТЕСТ` (ДАКрО) and the 6 empty `ФИЛЕС` (ЦДІАК); everything else migrates — normalized where obvious (trim `"514 "`, strip dash from `-17781`), as-is otherwise. Every decision logged to `anomalies.csv`.
3. **Conflict policy**: same code + same title → auto-merge, keep newest `updated_at`; `conflicts.csv` only receives same-code-different-title rows (e.g. ЦДАМЛМ two `БН` albums).
4. **Tooling**: standalone TS + `pg` scripts in `migration/` of this repo, CLI per archive with `--dry-run`.

5. **Д/ДОД and Ч/ЧАСТ** (confirmed): description-level `#Д` (679, "додатковий") → `ДОД`, `#Ч#` → `ЧАСТ`; case-level trailing `Д` (268) stays — it's an alphabet postfix (А,Б,В,Г,Д…).
6. **Legacy tables** (confirmed): TRUNCATE after all archives are migrated and verified (truncate is all-or-nothing — no per-archive deletes).
7. **New-only records** (confirmed): ЦДІАК's 32.5k new-only files and ДАДнО's 674 new-only fonds stay untouched.
8. **Out of scope** (confirmed): `sync_tasks`, `daily_stats`, `family_search_*` tables.
