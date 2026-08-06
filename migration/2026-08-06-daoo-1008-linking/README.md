# 2026-08-06 — ДАОО fond 1008 online-copy linking

Task: link the unlinked FamilySearch `online_copies` parsed as
`ДАОО-(1008_1[_N])` (user asked for `ДАОО-1008_1_3`; handled the whole
family of 11 sibling copies in one pass).

## State before

11 unlinked copies (`file_id IS NULL AND inventory_id IS NULL`):
`1008_1` (the опис itself) and `1008_1_1` … `1008_1_10` (справи 1–10).
**Fond 1008 did not exist in ДАОО at all** — no fond row, hence no
inventory or files either.

## What ran — `create-and-link.sql`

Created the full chain under archive ДАОО
(`f9019ed5-b622-4ff3-b9cf-77482ec168ef`), all with NULL titles matching
prior bulk-created catalog rows:

1. fond `1008` → `1106ad96-917b-47d6-88ab-3799874706c9`
2. inventory `1` → `3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98`
3. files `1`–`10`, `full_code = ДАОО-1008-1-<N>` (existing ДАОО convention)

Then linked:

- the 10 `1008_1_N` copies → their files (`file_id`)
- the bare `1008_1` copy → the inventory (`inventory_id`), per the
  established convention that an опис-level scan links `inventory_id`

Dry-run (ROLLBACK instead of COMMIT) verified 10 files / 10+1 updates /
0 remaining before the real run. Executed 2026-08-06; output in
`apply-output.log`.

## State after

All 11 copies linked; 0 unlinked `ДАОО-(1008_1…` remain.

## Files

- `before-unlinked.csv` — the 11 unlinked rows before the change.
- `create-and-link.sql` — the migration.
- `apply-output.log` — captured output from the real run.
- `created-rows.csv` — created fond/inventory/file ids.
- `linked-copies.csv` — the 11 copies after linking.
- `rollback.sql` — unlinks copies, then deletes files → inventory → fond
  (child-first order matters; run as-is).
