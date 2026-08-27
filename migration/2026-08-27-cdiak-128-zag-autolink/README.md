# 2026-08-27 — ЦДІАК ф.128 "Xзаг." FS copies → ЦДІАК-128-X-N

810 unlinked FS copies parsed as `ЦДІАК-(128-Xзаг.-N+++…)`. Fond 128
inventories `1`/`2`/`3` are all titled «Загальні справи», which FS cites as
`1заг.` / `2заг.` / `3заг.` — so the copy maps to file `ЦДІАК-128-X-N`.
Skipped by `2026-08-25-oc-linking-levels` L3: опис "1заг." fails its
`^\d{1,4}[letters]$` guard. 1,366 заг copies were already linked to inventory 1
in earlier rounds; these 810 are the remainder whose target files don't exist.

Because only 2 of 810 targets existed as files and `connect_to_online_copy`
needs a real `file_id`, the flow is: create the missing files directly
(bulk-import shape, like L3), then queue PENDING connect actions for admin
review — nothing is linked until each action is accepted (editor or
`accept-actions.sql`). Rolling back pending actions does NOT delete the bare
files; that would be a separate cleanup.

Sprava normalization (mirrors the already-linked заг copies):
- `ч.N` part suffix collapses to the base справа (`1327ч.3` → `1327`,
  `2637.ч2` → `2637`, `2304.1` → `2304`); parts share one file.
- trailing letter kept, uppercased (`87а` → `87А`).
- guard: normalized справа `^\d+[А-ЯІЇЄҐ]{0,2}$`.

## Preview (2026-08-27, prod)

| опис | copies | link existing | new files |
|------|--------|---------------|-----------|
| 1    | 552    | 2 (`2430ч.2/3`) | 543 |
| 2    | 133    | 0             | 133 |
| 3    | 125    | 0             | 125 |

810 mapped, 0 unparsed, 0 guard-rejected. 801 files to create (bulk-import
shape: code + full_code, NULL title). Описи 2 and 3 currently have 0 files —
they get populated fresh. Audit: `audit/preview-links.csv`.

## Scripts

```sh
psql … -f 01-preview.sql                     # read-only, writes audit/preview-links.csv
psql … -f 02-create-files-and-actions.sql    # create files + PENDING actions, dup-check
psql … -v who=script:2026-08-27-cdiak-128-zag -f accept-actions.sql            # after review
psql … -v who=script:2026-08-27-cdiak-128-zag -f rollback-pending-actions.sql  # undo pending
```

## Status

- [x] Preview run 2026-08-27 — 810 copies mapped, CSV reviewed.
- [x] 2026-08-28 — 801 files created; 810 PENDING `connect_to_online_copy`
      file_actions queued (`created_by = script:2026-08-27-cdiak-128-zag`).
      Audit: `audit/created-actions.csv`. Dup full_code check passed.
- [x] Accepted 2026-08-28 via `accept-actions.sql` — 810 copies linked, 810
      actions resolved, 0 left pending. ЦДІАК-128 описи 1/2/3 now carry
      1,918 / 133 / 125 linked copies. Unlinked ЦДІАК pool: 810 → 603.
