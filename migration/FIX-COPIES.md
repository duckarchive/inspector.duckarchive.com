# Fix: remove legacy-imported online copies (planned + executed 2026-07-13)

**STATUS: DONE.** Steps 1–4 below all executed against `inspector_local` on 2026-07-13.
Runner scripts: `migration/fix-copies-step1.sql`, `migration/fix-copies-step2.sql`
(exact SQL that ran, kept for the record — see "Result" under each step).

## Why

Phase 3 of the migration misunderstood the intent for online copies. It did two things:

1. **Attach** existing scraped `file_online_copies` / `inventory_online_copies` rows to
   files/inventories by `url` (+ `parsed` disambiguation) — **correct, stays**.
2. **Import** legacy copies that had no scraped counterpart as *new* rows
   (`copies.ts` Step B / invB, stat `copies_inserted_from_legacy`) — **wrong, must be undone**.

Intended model: the new copy tables are scraper-owned. Legacy copies should only have been
used as a url→instance map to attach scraped rows, never copied in.

Complication: `finalize.sql` was already committed — `case_online_copies` and
`description_online_copies` are **truncated**. The imported rows are now the *only remaining
record* of the legacy url→file mapping, so they must be salvaged into backup tables before
deletion.

## Ground truth (verified 2026-07-13 on `inspector_local`)

| fact | value |
|---|---|
| `file_online_copies` total / attached | 4,091,335 / 3,615,728 |
| `inventory_online_copies` total / attached | 24,912 / 24,771 |
| legacy copy tables | **empty** (finalize.sql committed) |
| Step-B rows (file level) | **1,641,283** |
| invB rows (inventory level) | **6,074** |
| `file_actions` / `inventory_actions` referencing Step-B rows | 0 / 0 |
| unattached rows whose url was in legacy | 1,770 — all `copy-ambiguous` anomalies |

Step-B rows are exactly identifiable by three conjoint conditions (each alone is insufficient):

- `updated_at` in `[2026-07-06 16:00, 2026-07-06 19:00)` — inserts got DB-default `now()`;
  the attach UPDATEs ran raw SQL, so they did **not** touch `updated_at` (Prisma `@updatedAt`
  is client-side). No scraper ran since (table max `updated_at` = 2026-07-06 18:45).
- `file_id IS NOT NULL` (window has 0 NULL-fk rows).
- `parsed = files.full_code` of the attached file (window matches 100%; the window bound is
  what excludes the 255,187 genuine scraped rows that also happen to satisfy this signature).

Arithmetic cross-checks (all exact):
`2,451,052 − 1,000 (A0 dedup) + 1,641,283 = 4,091,335`;
`18,838 + 6,074 = 24,912`;
report stats sum `1,639,984 + 1,299 (ДАТО, report.md overwritten by a later no-op re-run) = 1,641,283`.

## Step 1 — Salvage + delete (single transaction)

```sql
BEGIN;

-- 1a. Salvage into permanent tables: audit trail + the only surviving legacy url→instance map.
CREATE TABLE mig_removed_file_copies AS
SELECT foc.*
FROM file_online_copies foc
JOIN files f ON f.id = foc.file_id
WHERE foc.updated_at >= '2026-07-06 16:00' AND foc.updated_at < '2026-07-06 19:00'
  AND foc.parsed = f.full_code;
CREATE INDEX ON mig_removed_file_copies (url);

CREATE TABLE mig_removed_inventory_copies AS
SELECT ioc.*
FROM inventory_online_copies ioc
JOIN inventories i ON i.id = ioc.inventory_id
JOIN fonds fo    ON fo.id = i.fond_id
JOIN archives a  ON a.id = fo.archive_id
WHERE ioc.updated_at >= '2026-07-06 16:00' AND ioc.updated_at < '2026-07-06 19:00'
  AND ioc.parsed = a.code || '-' || fo.code || '-' || i.code;
CREATE INDEX ON mig_removed_inventory_copies (url);

-- 1b. Assertions — abort on any mismatch.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM mig_removed_file_copies;
  IF n <> 1641283 THEN RAISE EXCEPTION 'file salvage % <> 1641283', n; END IF;
  SELECT count(*) INTO n FROM mig_removed_inventory_copies;
  IF n <> 6074 THEN RAISE EXCEPTION 'inventory salvage % <> 6074', n; END IF;
  SELECT count(*) INTO n FROM file_actions
    WHERE online_copy_id IN (SELECT id FROM mig_removed_file_copies);
  IF n <> 0 THEN RAISE EXCEPTION '% file_actions would cascade', n; END IF;
  SELECT count(*) INTO n FROM inventory_actions
    WHERE online_copy_id IN (SELECT id FROM mig_removed_inventory_copies);
  IF n <> 0 THEN RAISE EXCEPTION '% inventory_actions would cascade', n; END IF;
END $$;

-- 1c. Delete by salvaged id.
DELETE FROM file_online_copies foc
USING mig_removed_file_copies r WHERE foc.id = r.id;        -- expect 1,641,283

DELETE FROM inventory_online_copies ioc
USING mig_removed_inventory_copies r WHERE ioc.id = r.id;   -- expect 6,074

COMMIT;
```

Immediately after commit, dump the safety net to disk (legacy source is gone — belt and braces):

```bash
pg_dump -d inspector_local -t mig_removed_file_copies -t mig_removed_inventory_copies \
  -Fc -f migration/out/removed-legacy-copies.dump
```

**Result**: ran exactly as written. Salvage counts matched the predicted 1,641,283 /
6,074 exactly (assertions passed), delete removed the same counts, post-delete totals were
2,450,052 / 18,838 (exact match to the pre-migration legacy-import baseline). Dump written to
`migration/out/removed-legacy-copies.dump` (~94 MB).

## Step 2 — Re-attach pass: legacy url → instance

The url attach (A1/A2) ran *before* Step B, so its work survives the delete untouched.
The only unattached rows with legacy urls are the 1,770 `copy-ambiguous` anomalies, so this
pass is expected to attach **≈ 0** rows — it exists to make the end state provably complete,
not because we expect gains.

```sql
-- Unambiguous-in-salvage urls → attach remaining NULL rows.
WITH url_map AS (
  SELECT url, min(file_id::text)::uuid AS file_id
  FROM mig_removed_file_copies
  GROUP BY url HAVING count(DISTINCT file_id) = 1
)
UPDATE file_online_copies foc SET file_id = um.file_id
FROM url_map um
WHERE foc.file_id IS NULL AND foc.url = um.url
  -- unique-index guard (same as migration batchAttach):
  AND NOT EXISTS (SELECT 1 FROM file_online_copies x
                  WHERE x.resource_id = foc.resource_id AND x.file_id = um.file_id
                    AND x.parsed = foc.parsed AND x.url = foc.url)
  -- ambiguity guard: salvage holds only legacy pairs that lacked counterparts, so a url can
  -- look unambiguous here while the legacy map had 2 candidates (A2 attached the other one).
  -- Evidence of that = an existing attached row with same url but different file → skip.
  AND NOT EXISTS (SELECT 1 FROM file_online_copies y
                  WHERE y.url = foc.url AND y.file_id IS NOT NULL
                    AND y.file_id <> um.file_id);

-- Same shape for inventory_online_copies / mig_removed_inventory_copies
-- (inventory_id instead of file_id).
```

Ambiguous leftovers stay `file_id = NULL` (same policy as the migration: url alone must never
decide among multiple candidates — see PLAN.md global finding 5).

**Result**: 0 rows attached at both levels, exactly as predicted — A1/A2 had already run to
completion before the bad Step B insert, so nothing was left for this pass to find. Post-run
attached counts: 1,974,445 (file) / 18,697 (inventory) — exact match to plan.

## Step 3 — Verify

| check | expected |
|---|---|
| `file_online_copies` total | 2,450,052 (= pre-migration 2,451,052 − 1,000 A0 dupes) |
| `file_online_copies` attached | 1,974,445 + Step-2 gains (≈ 0) |
| `inventory_online_copies` total | 18,838 (= exact pre-migration count) |
| `inventory_online_copies` attached | 18,697 + Step-2 gains |
| rows matching the Step-B signature inside the window | 0 |

Completeness proof (the actual point of Step 2): every legacy url that still exists among
scraped rows is attached to its mapped file; exceptions must all trace to the 1,770 ambiguous
anomalies. Any others → CSV for manual review.

```sql
SELECT r.url, r.file_id
FROM (SELECT DISTINCT url, file_id FROM mig_removed_file_copies) r
WHERE EXISTS (SELECT 1 FROM file_online_copies foc WHERE foc.url = r.url)
  AND NOT EXISTS (SELECT 1 FROM file_online_copies foc
                  WHERE foc.url = r.url AND foc.file_id = r.file_id);
```

Then `VACUUM (ANALYZE) file_online_copies, inventory_online_copies;` and an app spot-check:
random file pages that had scraped copies still render them; pages whose only copies were
legacy-imported now correctly show none.

**Result**: signature check = 0 (no Step-B-shaped rows remain). The completeness query as
written above returned 137,910 "gaps", far above the ~1,770 predicted — this was the query
being naive, not a data problem. Breakdown: 137,866 trace to genuinely ambiguous legacy urls
(one url shared by ≥2 legacy files — PLAN.md finding 5's 42.7k ambiguous URLs) where the
*other* file at that url legitimately has its own scraped copy already attached; the salvage
row's file was simply never scraped. The remaining 44 are the same phenomenon one level
removed: unambiguous *within the salvage set* (only one legacy case lacked a scraped
counterpart) but the url's scraped row is correctly attached to a *different* file — because
that file's copy had a legacy counterpart too, attached via A1 during the original run, while
this file's never existed in scraped form. Checked all 44 individually: every one has
`still_null_at_url = 0`, i.e. the url is fully accounted for, just not by this file. **Net: 0
real gaps.** `VACUUM (ANALYZE)` run.

## Step 4 — Code & docs (so no future run repeats this)

- `migration/src/copies.ts`: **done.** Step B / invB no longer `INSERT`; they now `SELECT
  count(*)` into new stats keys `copies_legacy_only_no_scrape` / `inv_copies_legacy_only_no_scrape`
  (informational — legacy copy with no scraped counterpart just means unscraped, not a defect).
- `migration/src/verify.ts`: **done.** `missingCopies` no longer requires literal (url, file_id)
  counterparts for every legacy row. It now flags only urls where a scraped row exists but the
  attach steps left *every* row at that url unattached (`file_id IS NULL` everywhere) — a
  genuine attach miss, distinct from "legacy has it, scraper doesn't."
- `migration/PLAN.md`: **done.** Phase 3 rewritten, banner linking here added.
- `mig_removed_*` tables: **kept** (not dropped) — they are the only legacy url→instance record
  in existence now that `case_online_copies`/`description_online_copies` are truncated. Also
  dumped to `migration/out/removed-legacy-copies.dump`.

## Rollback

`INSERT INTO file_online_copies SELECT * FROM mig_removed_file_copies;` (same for inventory
level) restores the exact pre-fix state — ids, timestamps and all.

## Open question

Is `inspector_local` going to be promoted to prod, or will the migration re-run against prod?
- **Promote local** → Steps 1–3 are the real fix; Step 4 is hygiene.
- **Re-run on prod** → Step 4 is the real fix; prod still has its legacy tables, so no salvage
  gymnastics needed there — the corrected pipeline just never imports.
