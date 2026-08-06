# 2026-08-05 — file-code integer anomaly review (READ ONLY)

Fundamental review of `files.code` integer parts across the whole DB, hunting
OCR/parse artifacts of the shape *«справи 1,2,3,4,5, … 1006, 1017»* — where a page
number, year, or another column got glued onto the справа number during OCR.

**Nothing was executed against the DB.** This folder contains findings + prepared
steps for later execution.

## Detector

Per inventory with ≥ 8 distinct integer codes (`ci` = leading digits of `files.code`):

```
anomaly ⇔ ci > max(5 × p95(ci), p95(ci) + 100)
```

p95 is the robust ceiling of the inventory's code sequence; the 5× factor keeps
legitimately sparse-but-large inventories (e.g. ДАКО-Р5597 filtration files,
116k codes up to ~190k) out of the results while catching order-of-magnitude
jumps like `ДАКрО-640-1` code `22445` in a 1…23 sequence.

## Findings — 1,380 anomalous files in 354 inventories

| class | count | meaning |
|---|---|---|
| **concat** | 1,232 | an existing in-body code is a string-prefix of the anomaly (`118549` in ДАХО-958-1 whose body ends at 116 → справа 118 + page 549) |
| **isolated** | 89 | huge value, no prefix match (e.g. `3074936573` in ДАХмО-Р6193-12) — OCR garbage or foreign identifier |
| **year-like** | 59 | value in 1800–2030 glued from a date column (`1920` in ДАХеО-169-1, body ≤ 45) |

Key cross-checks performed:

- **None** of the anomalies came from the 2026-08-05 online-copies linking session
  (0 overlap with `../2026-08-05-online-copies-linking/tier3-map.csv`) — all are
  pre-existing catalog/sync data.
- **832 of 1,380 (60%)** sit in metric-book fonds (fond title matches
  метричн/консистор/церкв/…). For these, `migration/acmb/` (Зведений каталог
  метричних книг, 10 OCR volumes) is the authoritative source to recover the true
  справа numbers.
- Top archives: ДАХмО 220, ДАВіО 177, ДАЧвО 151, ДАПО 132, ДАДнО 86, ДАЖО 79.
- 107 anomalies are **empty shells** (no title, no online copies, years, locations,
  authors, or actions) — nothing references them.
- 305 concat anomalies have exactly **one** possible base file and carry data
  (title/copies/years) — merge candidates.

## Files

| file | contents |
|---|---|
| `anomalies.csv` | all 1,380: file_id, arch/fond/inv, code, int part, class, base candidates, dependency counts, empty-shell flag |
| `inventory-summary.csv` | 354 inventories ranked by anomaly count, split by class |
| `anomalies-with-data.csv` | the 1,270 anomalies that carry data (need care) |
| `step3-merge-candidates.csv` | the 305 unambiguous merge pairs, human-readable |
| `step2-deleted-rows-backup.csv` | full rows of the 107 empty shells (restore data) |

## Execution steps (in order, each independently reviewable)

1. **`step1-verification-queries.sql`** — read-only; re-runs the detector and
   prints counts to compare against this document. Run first; if numbers moved,
   regenerate the review before proceeding.
2. **`step2-delete-empty-shell-anomalies.sql`** — deletes the 107 empty shells
   (concat/year-like only; isolated ones are NOT deleted). Transactional.
   Reversal: `rollback-step2.sql`.
3. **`step3-merge-unambiguous-concat.sql`** — ⚠️ only after verifying pairs
   against acmb OCR / source archive. Merges the 305 anomalies into their base
   file: relinks online copies (unique-guarded), moves years/locations/authors,
   copies title onto untitled bases, deletes the anomaly. Transactional; includes
   a leftover-check SELECT.
4. **Manual / acmb-assisted review** — everything remaining (~968 rows in
   `anomalies-with-data.csv` minus step-3 pairs): ambiguous concat splits
   (multiple possible bases), isolated outliers, year-like rows with data.
   Suggested workflow: for metric-book fonds, grep the acmb volume for the fond
   (`Ф. N`) and the file's year range/title to recover the true справа number,
   then either rename (if code free) or merge (if taken).

## Execution log (2026-08-05)

- **step1** ✓ counts matched the review exactly (1,380 / 354; 1,232 / 89 / 59).
- **step2** ✓ 107 empty shells deleted.
- **step3** ✓ 305 merges applied (15 copies relinked, 156 year ranges + 95 author
  links moved, 7 titles copied).
- **acmb cross-check** (`acmb_verify.py` → `acmb-verification.csv`) ran *after*
  step3: 555k `ф./оп./спр.` references extracted from the 15 OCR volumes,
  section-scoped to archives by running headers. Verdicts on the 305 pairs:
  **90 confirmed**, **33 confirmed-year-glue** (the printed catalog itself shows
  the glued «спр. 58 1884» form), 47 base-missing (inconclusive — acmb lists only
  metric books), 133 no-acmb-data (archive/fond not covered), **2 CONFLICT**.
- **step3b** ✓ repaired the 2 disproved merges:
  - `ДАКрО-674-1-421` → true home is спр. **12** (1904–1905, Диківка; «421» was
    the catalog's own page number glued at a page break — visible in том 7).
  - `ДАОО-37-5-238` → real справа («1893: ф. 37, оп. 5, спр. 238»); file
    recreated with its year and authors.

Post-verification merge accuracy: 303/305 correct as executed, 2 repaired.
Caveat: under-extraction in the OCR parse (lists like «спр. 238, 249 (дублет)»
only yield the first number) can hide further conflicts inside the 47
base-missing / 133 no-acmb-data groups — treat those as unverified, not cleared.

## Step 4 — acmb year-matching reconciliation (2026-08-05)

Tooling: `acmb_lookup.py` (per-item evidence card), `step4_engine.py` (sequential
processor), `step4-worklist.csv` (1,016 items — re-detection after steps 2/3
exposed 48 new outliers), `step4-decision-log.csv` (every item + evidence).

Match rule per item: acmb refs for (archive, fond, опис) filtered by year
overlap and by title-place mention near the ref; the item's own glued number is
dropped when it echoes in the acmb OCR. Resolve on a single surviving candidate,
or a unique prefix-consistent candidate with an exact year-range match.

Results: **347 merged** into their true справа (0 renames needed — every
resolved target already existed), 1 skipped, 0 errors, **669 → review**:
345 without acmb coverage or without years, 119 with no candidates after
filters, 205 with multiple candidates. Sample audits verified: merged files
gone, targets enriched (years/authors/titles onto NULL-or-generic bases only).

Notable OCR glue species identified: page numbers (`22445`=22+445), years
(`581884`=58+1884), catalog page numbers at page breaks (`421`), rubric numbers
(`6837`=683+«7.»).

## Step 5 — mechanical split-rule fixes (2026-08-06)

Tooling: `step5_apply.py` (plan + apply), `step5-plan.csv` (decision per item),
`step5-backup.jsonl` (pre-fix rows of all touched files + related tables),
`STEP5-PROPOSAL.md` (rationale). Input: the 669 step-4 `review` leftovers.

Revised target rule after spot-checks disproved naive equal-splitting:
справа = digit-prefix ≤ max(1.25·p95, p95+50), glued remainder = 1–1500, no
leading zero; self-year splits (4-digit year suffix matching the file's own
years ±5) win first. Guards that sent items back to manual: series-suspect
inventories (dense consecutive runs = legit numbering: ДАПО-Р9106-1 filtration
files, ЦДАВО-1092-3), year-glue with no own years to arbitrate (ЦДІАК 31919),
codes that are simply the file's own year (1919/1920 blocks).

Result: **352 fixed** (308 merged into existing bases, 44 renamed onto free
codes; 13 self-year among them), 0 errors. 309 stay manual. Notable rule
lesson: in ДАХмО-315-1 the true справа is the *longest* plausible prefix
(`11811263` = спр. 11811 + арк. 263 — справа↔year monotone confirms), so the
short equal-split reading was wrong there.

Post-step detector residue: **360 anomalies / 133 inventories** (was 1,380 /
354 at the start of this review) — the 309 manual holds plus ~50 newly exposed
by p95 shifts after the merges.

## Out of scope, noted for later

- 11,738 files have **no digits at all** in `code` — separate review.
- Inventory-level year-like codes were partially cleaned earlier
  (`migration/delete-*yearlike-inventories.sql`); not re-audited here.
- Low-side anomalies (справа 0, negative-looking codes) not hunted.
