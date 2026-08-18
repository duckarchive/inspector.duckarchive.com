# 2026-08-12 — НМІУДСВ-ТФ1 title/years OCR fix

## Background

`online_copies.parsed` for archive НМІУДСВ (Національний музей історії
України у Другій світовій війні), fond ТФ1 "Трофейний фонд", embeds an
internal FamilySearch reference number (e.g. `Тф-5211-12`) that got used as
`files.code`/`full_code`. That number is unrelated to the real "Справа №"
printed on the actual scanned document — e.g. file code `12` in inventory 5211
is actually "Справа № 7" per its cover page. `files.title`/`file_years` for
this fond need to be re-derived from the actual document images via OCR.
Scope: 4,840 `online_copies` (`parsed LIKE 'НМІУДСВ%'`), 4,813 files, all one
fond. This migration only fixes `title`/`file_years` — `code`/`full_code` are
untouched, and this batch does not touch the 19 still-unlinked copies.

The user had already manually titled 24/36 files in inventory 5499
(`c2a8993d-c149-4a4d-b5b0-b2cbf075427c`, "Шепетівсько-Полонський
[об'єднаний міський] військовий комісаріат") as a reference example. This
batch is the OCR pipeline's first real run, covering the 12 files in that
same inventory the user hadn't gotten to yet (codes 31-36, 1001-1006).

## Pipeline

1. DGS extracted from `online_copies.url`'s `imageGroupNumbers` query param.
2. First 2 images per DGS fetched via `https://www.familysearch.org/dz/v1/<apid>/dist.jpg`
   — the gateway path used by `duckarchive/browser-extension`'s
   `content-scripts/familysearch-duck-loader.ts` (`DZ_URL`), not the raw
   shard host (`sg30p0.familysearch.org/.../deepzoomcloud/dz/v1/apid:.../$dist`),
   which is throttled far more aggressively (~1 req/20-25s) and isn't
   viable at any real scale. The gateway path tolerated back-to-back
   requests with zero delay in testing.
3. Both images sent to Gemini (`gemini-2.5-flash`) per case with a
   structured-output schema requesting: institution, справа №, verbatim
   title text, start/end year, raw date text, confidence, notes.
4. Raw OCR results cached in `gemini-ocr-cache.json` (12/12 entries) so this
   batch never needs to re-call Gemini.

## Findings — this batch is NOT uniform like the 24 already-fixed files

The `code` numbering jump (1-30 → 31-36 → 1001-1006) marks a real content
shift, not just more of the same case-file type:

- Files 31-36: individual documents (instructions, burial-registration
  cards), several with generic "ПАПКА ДЛЯ паперів" covers rather than the
  printed museum template, institution/title handwritten instead.
- Files 1001-1006: "Алфавітна книга" (alphabetical registry) volumes and one
  outlier — different institutions, different document class entirely.

Because of this, titles use each file's own actual document title/type
rather than the shared "Х РВК. Сповіщення про загибель..." boilerplate that
fits the other 24. `title` = `<institution>. <document's own title text>`.

**Decisions made with the user (2026-08-12):**
- `file_years` for the four "Алфавітна книга" registers (1001-1004): use the
  WWII **subject period** stated in the book's own title (1941-1945), not
  its physical operating dates (Gemini found 1956-1957 for vol. 1/2 from
  the book's start/end stamps) — chosen because the title itself states the
  subject period, and Gemini was inconsistent between sibling volumes on
  which to prefer.
- File 1005 (`a2b6e97e-…`) is stamped "фонда №1187 оп.№0256-601", which may
  indicate it's misfiled from a different fond entirely (unrelated to ТФ1).
  Titled anyway per the user's decision — **flagged here for anyone who
  later wants to investigate whether it belongs in fond 1187 instead.**
- File 32 (`19bd4276-…`) came back `confidence: medium` — no printed cover
  found, title/date inferred from the document's own content page.

## Files

- `gemini-ocr-cache.json` — raw structured OCR output per file (all 12,
  including confidence/notes), so re-running Gemini isn't needed if the SQL
  needs revising.
- `fix-titles-batch1.sql` — the migration (title UPDATE + file_years INSERT,
  wrapped in BEGIN/COMMIT with verification SELECTs).
- `rollback-batch1.sql` — reverts title to NULL and deletes the inserted
  file_years rows.
- `pre-backup.sql` — full `pg_dump` of `files`/`file_years`/`online_copies`/
  `inventories`/`fonds` taken before any writes in this session (2026-08-12,
  1.7GB — whole-catalog scope, not just this archive).

## Status (batch 1, 12 files)

**Not yet applied.** Prepared and cached, pending review — DB writes are on
hold per explicit instruction earlier in this session.

## Full-archive OCR pass (2026-08-12, all 4,840 online_copies)

At the user's request, re-ran the same pipeline across the entire archive
(not just inventory 5499) and dumped raw results to CSV for manual review
before any SQL is written — **no DB writes happened for this pass, review
only.**

**Output:** `nmiudsv-full-archive-ocr.csv` — one row per `online_copies` row,
columns: `online_copy_id, url, parsed, linked_full_code, ocr_title,
ocr_description, ocr_start_year, ocr_end_year, ocr_institution,
ocr_full_title_raw, ocr_sprava_number, ocr_raw_date_text, ocr_confidence,
ocr_notes, ocr_images_used, ocr_error, dgs`. `ocr_title` = `<institution>.
<document's own title text>` (composed, ready to drop into `files.title`
after review). `ocr_description` bundles справа №/printed date/notes for
context. 4,838/4,840 rows have clean OCR data; 2 rows (both referencing the
same DGS) have `ocr_error` set — that single DGS never returned usable data
despite repeated retries with a dedicated worker.

Confidence breakdown: 4,481 high / 239 medium / 119 low (per Gemini's own
self-assessment — worth sorting the CSV by this column first when reviewing).

**Execution notes, in case this needs re-running or extending:**
- Ran via a Chrome DevTools-injected pipeline (not a Node script) since
  FamilySearch's image gateway requires the authenticated browser session's
  cookies — see the conversation for why a pure server-side script isn't
  viable here (Akamai bot detection on the raw image-storage host; the
  `dz/v1/.../dist.jpg` gateway path is the one that works at volume).
- **Key gotcha:** running the fetch/OCR loop on the page's main thread stalls
  completely once the browser tab is backgrounded (not visible on screen) —
  Chrome suspends timer/async processing so aggressively that even a bare
  `setTimeout` doesn't fire. This looked exactly like an external rate limit
  (silent stall, no errors) and cost real time to correctly diagnose via
  `document.hidden`. **Fix:** moved all fetch/OCR work into dedicated Web
  Workers (immune to page-visibility throttling) — confirmed to keep
  processing at full speed even while the tab is hidden. Any future run
  should go straight to the Worker-pool approach, skip the main-thread one.
- Once on Workers, sustained ~110-125 DGS/min at 16 concurrent workers with
  no real FamilySearch throttling observed (the earlier "cumulative rate
  limit" theory was a misdiagnosis of the freeze above, not a real wall).
- Gemini `503` (transient overload) needs retry handling alongside `429` —
  the first pass's worker script only retried on 429, producing a burst of
  ~150 avoidable errors under sustained load; the retry pass's script fixed
  this (retries on 429/503/500 with backoff) and cleared all but 1 of the
  gap items.
- Total run: ~4,838 unique DGS × (1 DAS lookup + 1 children lookup + 2 image
  fetches + 1 Gemini call) ≈ 24,000 HTTP requests + ~4,838 Gemini calls,
  completed in roughly 90 minutes wall-clock once the Worker-pool/visibility
  issue was resolved.

## Files (full-archive pass)

- `worklist.json` — the 4,840 `online_copies` rows queried up front
  (`online_copy_id, url, parsed, linked_full_code, dgs`).
- `ocr-by-dgs.json` — deduplicated OCR results keyed by DGS (4,838 entries).
- `full-ocr-checkpoint.json` / `retry-final.json` — raw intermediate dumps
  from the main run and the gap-fill retry pass; superseded by
  `ocr-by-dgs.json` but kept for audit/debugging.
- `nmiudsv-full-archive-ocr.csv` — **the deliverable**, for manual review.

## Status (full-archive pass)

**APPLIED 2026-08-18** via `apply-title-info-full.sql` — deeper structuring
(real справа №/том, file_years, possible code fixes) turned out more complex
than expected, so the decision was to write what OCR recognized into
`files.title` + `files.info` now and keep the raw texts in the CSV in this
repo for future passes.

What was written (4,811 of 4,813 files):

- `title` ← `ocr_title`, EXCEPT the 24 manually-titled files in inventory
  5499 (identified by `title IS NOT NULL AND updated_at IS NOT NULL`; bulk
  import left `updated_at` NULL) — those keep their human titles. The 2,434
  generic bulk placeholders ("Сповіщення про загибель - 1939-1945" etc.)
  were overwritten, 2,353 NULL titles filled.
- `info` ← `ocr_description` + provenance marker
  `[OCR gemini-2.5-flash, впевненість: висока/середня/низька]` — written for
  all 4,811 matched files (`info` was NULL archive-wide before). The marker
  makes OCR-derived rows queryable later (`info LIKE '%[OCR%'`).
- `updated_at` set to the apply timestamp on all 4,811 rows.
- Skipped: 2 CSV rows for the one failed DGS (their files
  НМІУДСВ-ТФ1-5497-42 and НМІУДСВ-ТФ1-5456-2 remain untitled), the 19
  file-unlinked copies. Where several copies map to one file, the
  highest-confidence row won.
- `file_years` NOT touched in this pass — year data (`ocr_start_year`/
  `ocr_end_year`/`ocr_raw_date_text`) stays in the CSV for a future,
  separately-reviewed pass. Batch 1 above (12 files, title + file_years)
  was superseded by this full pass for titles; its file_years remain
  unapplied.

Rollback: `rollback-title-info-full.sql` restores title/info/updated_at for
all 4,813 files from `pre-state-title-info.csv` (snapshot taken immediately
before the apply).

Not committed to git (see .gitignore): `pre-backup.sql` (1.7GB full dump),
`full-ocr-checkpoint.json`/`retry-final.json` (superseded intermediates,
kept locally only).
