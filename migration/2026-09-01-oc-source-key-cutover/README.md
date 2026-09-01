# 2026-09-01 — online_copies source-key cutover

Companion to `@duckarchive/prisma` migration
`20260901120000_online_copies_source_key` and the scrapper's keyed sink
(`scrapper/src/core/online-copies.ts`). Fixes the root cause behind
`2026-08-25-fs-online-copies-dedup` and the drift section of
`2026-08-31-oc-link-round2`: a copy's identity was `(resource_id, parsed, url)`
and FamilySearch rewrites `parsed` between syncs, so every re-sync minted an
unlinked twin next to the linked row (32,148 redundant linked rows in 21,713
groups on 2026-08-31, regenerating every cycle).

## What changed

- `online_copies.source_key` — the scraper's stable id of a claim within
  `(resource_id, url)`: FamilySearch image-group id, libraria number id, nbuv
  item id, archium act id, ushmm irn, babyn-yar case id; the code text itself
  for sources without ids. **NULL = editor-owned row** (`add_online_copy`, FS
  imports) — never a scraper claim.
- `parsed` is now a **mutable** claim text: the scraper refreshes it in place on
  the row it finds by key, linked or not.
- DB invariants: `UNIQUE (resource_id, url, source_key)`; one row per
  `(resource_id, url, file_id)` and per `(resource_id, url, inventory_id)`
  (partial uniques). The inert 5-column unique is gone.
- `created_at` column; `*_actions.online_copy_id` is `ON DELETE SET NULL`.
- App: `connect_to_online_copy` / `add_online_copy` / merges fold a copy into the
  row already holding the edge (`adoptCopyInto`), autolink skips such matches
  (`already_linked` in the preview), a residual `P2002` on resolve is a 409.

The migration itself deduplicates: already-linked twins on one `(resource,
url, target)` collapse to the row the scraper still maintains (latest
`checked_availability_at`), exact `(resource, url, parsed)` twins collapse
(different-parent ones are kept as demoted, NULL-key second edges), action
history is repointed first, then every remaining scraper row gets
`source_key = parsed`. The first keyed sync of each plugin swaps that legacy
key for the native one in place ("adoption").

## Runbook

1. `psql … -f 00-preflight.sql` (read-only) — paste the numbers below.
2. `pm2 stop` the scrapper; purge queued FamilySearch `availability` jobs
   (`node scripts/cleanup-queue-jobs.mjs FAMILY_SEARCH --apply` in the scrapper).
3. Apply the prisma migration (`prisma migrate deploy --config prisma-inspector.config.ts`
   in the prisma repo). Minutes: whole-table window scans, a backfill rewrite,
   three index builds. `VACUUM ANALYZE online_copies` after.
4. Deploy this app (needs `@duckarchive/prisma` ≥ 6.5.0).
5. Deploy + start the scrapper; note the time as `cutover`.
   `psql … -f 01-post-deploy-null-keys.sql` once (rows an old scrapper build
   may have written in between; usually 0).
6. After the first keyed FamilySearch full sync (force it by resetting the FS
   tasks' `next_run_at`, or wait a 5-day cycle):
   ```sh
   psql … -v cutover='2026-09-02 10:00' -f 03-preview.sql          # read-only, audit/adopt-pairs.csv + audit/ambiguous.csv
   psql … -v cutover='2026-09-02 10:00' -f 04-execute.sql          # DESTRUCTIVE: 1:1 pairs → linked row takes the key
   psql … -v cutover='2026-09-02 10:00' -f 05-prune-stale-unlinked.sql  # DESTRUCTIVE: unlinked legacy claims the source dropped
   psql … -v cutover='2026-09-02 10:00' -f 06-review-drifted-links.sql  # read-only review list
   ```
   `02-cutover-groups.sql` is the shared builder, `\i`-included by 03 and 04.
   Ambiguous urls (several stale linked and/or several fresh rows) are never
   touched — review `audit/ambiguous.csv`.

Do **not** re-run `2026-08-31-oc-link-round2/03-04` as they are: they delete the
keyed twin without moving `source_key`, and the next sync re-mints it. The rule
everywhere now: the linked row survives and takes the fresh row's
`source_key` + `parsed`.

## Measured

_(fill from 00-preflight.sql before the migration, and from 03/04/05 output after)_

| | |
|---|---|
| A. file edge dup groups / rows to delete | |
| A. inventory edge dup groups / rows to delete | |
| B. claim dup groups / losers / multi-parent (demoted) | |
| 04-execute: pairs adopted | |
| 05-prune: rows pruned | |

## Rollback

The migration is one transaction — a failure leaves nothing behind. After it
committed, the deleted twins are gone by design (they were duplicates of rows
that survive with the same link); the prisma repo keeps the schema history, a
`pg_dump` of `online_copies` + `file_actions` + `inventory_actions` before step 3
is the only full rollback. 04/05 write what they delete to `audit/` first.
