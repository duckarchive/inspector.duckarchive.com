# 2026-09-01 — remove redundant root-DGS FamilySearch online_copies

FamilySearch `online_copies.url` for the `fs` resource comes in exactly two
shapes (verified to partition all 2,299,329 FS rows with no third shape):

- **root**: `…?imageGroupNumbers=<DGS>` — whole-film browse link.
- **specific**: `…?imageGroupNumbers=<DGS>_<seq>_<imgId>` — pinpoints one
  item (справа) within that film. See the DAS API notes in `scripts/to-dgs.ts`.

When a catalog target (file or inventory) is linked to **both** a root copy
and a specific copy for the **same DGS**, the root copy adds nothing — the
specific one already identifies the exact location within the film for that
target. This migration removes those redundant root copies.

Scope is narrower than it may sound: of 2,199,134 root copies, only
**1,607** had a same-target specific sibling. (Most specific-form copies —
39,318 of 100,195 — are actually unlinked FS blobs with no ref/title, part of
the "olibNotes fallback" backlog noted in `migration/2026-08-25-oc-linking-levels/README.md`;
those don't create redundancy and were left untouched.)

## Findings

- **1,607 root copies deleted**, across **1,179 files + 11 inventories**.
- 47 of those roots matched more than one same-target specific sibling (the
  film was split into several specific items covering one справа); the
  lowest-`url` sibling was picked as the deterministic survivor.
- **1,568 resolved `connect_to_online_copy` actions** (1,556 file + 12
  inventory) referenced a doomed root copy. `online_copy_id` is
  `ON DELETE CASCADE` on both actions tables, so these were **repointed** to
  the surviving specific copy first, rather than lost to cascade delete.
  0 pending actions were affected (verified in preview).

## Scripts

```sh
psql … -f 01-preview.sql   # read-only, writes audit/preview.csv
psql … -f 02-execute.sql   # DESTRUCTIVE: repoint actions, delete root copies
psql … -f rollback.sql     # undo, from 02-execute.sql's own audit backups
```

`00-candidates.sql` is the shared rule set, `\i`-included by both.

## Status

- [x] 2026-09-01 — preview run: 1,607 to delete, 1,568 actions to repoint,
  0 pending. Audit: `audit/preview.csv`.
- [x] 2026-09-01 — `02-execute.sql` run: **1,607 root copies deleted**,
  **1,568 actions repointed** (1,556 file + 12 inventory). Backups:
  `audit/deleted-root-copies.csv` (full row snapshot), `audit/repointed-actions.csv`
  (original `online_copy_id` per action, for `rollback.sql`).
- [x] Post-check note: the script's original post-check compared only on
  `target_id`, not `dgs`, and flagged 310 false positives — targets that
  legitimately keep an unrelated root copy for a *different* film. A direct
  same-dgs re-check confirmed **0 true remaining overlaps**; `02-execute.sql`
  was corrected in place so the script itself is accurate for future readers.
- [x] Post-migration counts: FS copies 2,299,329 → 2,297,722 (−1,607);
  pending actions unchanged at 0.
