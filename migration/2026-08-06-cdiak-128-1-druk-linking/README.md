# 2026-08-06 — ЦДІАК-128-1друк. online-copy linking

Same task as [`../2026-08-06-cdiak-128-1-zag-linking`](../2026-08-06-cdiak-128-1-zag-linking/README.md),
for a different inventory: link `online_copies` rows parsed from
FamilySearch as `ЦДІАК-128-1друк-*` to files in inventory
`9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c` (ЦДІАК → fond 128 → inventory
`ДРУК1` "Друкарські справи", hence "друк" in the FamilySearch code).

## State before

1310 `online_copies` rows matched `parsed ILIKE '%ЦДІАК%128%1друк%'`:

- **1227** already correctly linked into this inventory — no action needed.
- **83** unlinked, all matching a `<справа>ч.<part>` pattern across 37
  distinct base справа numbers.

## Difference from the -zag- migration

In the -zag- case none of the base справа numbers existed as files yet. Here,
**3 of the 37** (413, 501, 1294) already existed — each already linked to its
own no-suffix `128-1друк-N` online copy, confirming the base-file convention
(a multi-part справа is one catalog file; parts share it). Those 3 were
linked to directly, not recreated. The other **34** were missing and were
created the same way as the -zag- migration (code + full_code only, NULL
title/info/tags, matching this inventory's bulk-imported files —
`full_code = ЦДІАК-128-ДРУК1-<code>`, note this inventory's code is `ДРУК1`
not a bare number).

## What ran — `create-and-link.sql`

1. Created 34 `files` rows under inventory `9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c`
   for the base справа numbers not already present.
2. Set `file_id` on all 83 previously-unlinked online copies, matching each
   row's base справа number (regex `128-1друк-([0-9]+)ч\.[0-9]+`) against
   `files.code` in this inventory — covering both the 34 new files and the
   3 pre-existing ones.

Dry-run (`ROLLBACK` instead of `COMMIT`) confirmed 34 files / 83 rows updated
/ 0 remaining unlinked before executing for real.

## State after

All 1310 `ЦДІАК-128-1друк.` online copies now have `file_id` set, all
pointing into inventory `9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c`. Inventory
file count: 1226 → 1260.

## Files

- `before-unlinked.csv` — the 83 unlinked rows before the change.
- `create-and-link.sql` — the migration.
- `apply-output.log` — captured output from the real run.
- `created-files.csv` — the 34 new file rows (id, code, full_code).
- `linked-copies.csv` — the 83 online_copies rows after linking.
- `rollback.sql` — unlinks all 83 copies, then deletes only the 34 files
  this migration created (the 3 pre-existing files are left alone).
