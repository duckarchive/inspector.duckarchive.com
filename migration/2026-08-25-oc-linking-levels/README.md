# 2026-08-25 — online_copies linking, level by level, through the actions queue

Unlinked pool at start: **203,334** (was 77,579 after `2026-08-25-autolink-create-missing`;
new imports since: BABYN_YAR 62k, GOOGLE_DRIVE 10k, dp.archives.gov.ua 6k, FS growth).

Workflow per level: the script creates **PENDING** `file_actions` / `inventory_actions`
(`type = connect_to_online_copy`, `resolved_at IS NULL`) tagged by `created_by`,
plus an audit CSV → review → `accept-actions.sql -v who=<created_by>` links the
copies and resolves the actions. `rollback-pending-actions.sql -v who=…` deletes
a level's still-pending actions. Levels are run **one at a time**, each accepted
before the next is created. L3 (catalog creation) is the exception: preview CSVs →
direct create+link on execute (no queue), mirroring `autolink-create-missing`.

All scripts: fold/norm2 both sides (homoglyphs, АРХ-Р- collapse, trailing letter),
ЦДНТА excluded everywhere, every match must hit exactly ONE target, copies with a
pending action are skipped by later levels. Run from this folder.

## Levels (run order; dry-run counts of 2026-08-25)

| # | script | created_by | what | file acts | inv acts |
|---|--------|-----------|------|-----------|----------|
| L1 | `01-l1-exact-actions.sql` | `script:2026-08-25-l1-exact` | plain parsed = files.full_code / archive-fond-inventory (BABYN_YAR, GDRIVE, dp.archives WEBSITE) | 70,471 | 2,330 |
| L2 | `02-l2-fs-ref-actions.sql` | `script:2026-08-25-l2-fs-ref` | FS blob non-empty ref = full_code; + опис-marker и справи-range → inventory | 20,465 | 36 |
| L4 | `03-l4-volume-actions.sql` | `script:2026-08-25-l4-volume` | FS empty-ref, title `Volume <ф>-<о>/<с>` (ЦДІАЛ/ДАЧвО/ДАТО…); range/multi-Volume → inventory | 23,846 | 530 |
| L5 | `04-l5-custom-actions.sql` | `script:2026-08-25-l5-custom` | p1 `Ф. f, о. o, д./ЕХ s` · p2 `Ф. f-o/s` · p3 bare `f-o/s` · p4 `фонд f, опись o` → inv · p5 ARCHIUM ДАЛО `ф-о том N-с` | 2,998+578 | 173 |
| L3 | `05-l3-preview.sql` (read-only) → `06-l3-execute.sql` | — (direct) | parsed points at missing справа/опис: tier C new files under existing inventories; tier B new inventories (+files) under existing fonds. Guards: справа `^\d+[А-ЯІЇЄҐ]{0,2}$`, опис ≤4 digits, unique parent | ~13,9k copies; 6,229+2,329 files; 47 invs | — |

L3 runs last — it consumes what L1/L2/L4/L5 didn't claim. Its preview flagged and
the опис-guard now excludes `ДАЗкО-1606-51895/-51929` (5-digit "опис" = mis-parse).
Tier B is dominated by ДАСО-7720 (ЗАГС, 17 описи) — plausible; ДАК gets описи
under fonds 202/208/238/245/253/263/297.

## Status

- [x] L1 created + **accepted** 2026-08-25 — 70,471 copies → files, 2,330 → inventories; 0 left pending.
- [x] L2 done 2026-08-25 — 20,465 file actions accepted by script; the 36 inventory actions were reviewed manually in the editor (approved/rejected there). 0 left pending.
- [x] L4 done 2026-08-25 — 23,846 file actions accepted by script; the 530 inventory actions were already resolved via manual editor review. 0 left pending.
- [x] L5 done 2026-08-25 — 3,576 file actions accepted by script (p1-p3: 2,998; p5 ДАЛО том: 578); the 173 inventory actions were resolved via manual editor review. 0 left pending.
- [x] L3 executed 2026-08-25 (both tiers) — 45 inventories + 8,555 files created (tier C 6,229, tier B 2,326), 13,959 copies linked directly; duplicate-full_code check passed. Audit: `audit/l3-executed-links.csv`.

## Result

Unlinked pool: 203,334 → **68,497** (-134,837 this migration; ~144.7k linked incl.
manual editor rounds on inventory actions). The remainder is the known-unparseable
set below.

## Left unhandled (known, deliberate)

- FS blobs with empty ref AND empty title: **38,622** — nothing to parse; needs the
  olibNotes fallback (see memory `fs-film-item-notes-olibnotes`).
- PL\_ sygnatury, Polish parish titles (Dekanat…), title-only blobs.
- ДААРК `Ф. __-1/381` — fond elided, needs per-film context.
- Wikisource ДАХО `П<fond>-<N>` (964) — П-fonds absent from catalog, 2-segment ambiguity.
- ARCHIUM ДАКрО/ДАКО leftovers (`--87, 88, м. Єлисаветград-`, `280-174 (додатк.)-141`).
- Ambiguous bare 2-segment `фонд-N` FS refs (опис-1-elided vs real опис).

## Accept / rollback

```sh
psql … -v who=script:2026-08-25-l1-exact -f accept-actions.sql
psql … -v who=script:2026-08-25-l1-exact -f rollback-pending-actions.sql   # undo pending
```

Accept links only copies still unlinked at accept time; a copy linked some other
way in the meantime leaves its action pending for manual review.
