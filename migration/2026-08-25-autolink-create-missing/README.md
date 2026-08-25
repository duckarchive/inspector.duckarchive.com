# 2026-08-25 — autolink: create missing catalog rows for unlinked online copies

Follow-up to the editor «Автопривʼязка» feature: unlinked `online_copies` whose
parsed code points at a справа/опис that does **not exist** in the catalog.
Executed directly (no action queue) as a one-off admin migration.

Normalization pipeline is identical to `/api/editor/online-copies/autolink`
(FS-blob extraction, homoglyph/Р-П-prefix folding, space collapse, том/частина
base-справа rule, `(опис)` marker, справи-ranges). A copy qualifies only when it
matched **nothing** existing at any priority.

## What was run (all committed 2026-08-25)

**01-create-missing-files.sql (tier C)** — parent inventory exists, справа missing:

- guards: справа code `^\d+[А-ЯІЇЄҐ]{0,2}$` (≤20 chars), exactly one inventory
  candidate per copy, ЦДНТА excluded (FS internal renumbering — never bulk-link);
- created **58,298 files** (bare rows: code + full_code, NULL title/info/tags —
  bulk-import shape), linked **58,368 copies**;
- 7,358 went into previously-empty inventories; ~22.5k are above the inventory's
  existing p95 numbering — inspected: partially-imported inventories
  (ДАХмО-234-1 консисторія, ДАМО-Р5859-1 ЗАГС etc.), legit continuations.

**02-create-missing-inventories.sql (tier B)** — fond exists, whole опис missing,
clean 4-segment refs:

- same guards on опис + справа codes, plus fond-uniqueness per copy;
- created **139 inventories** + **5,572 files**, linked **5,574 copies**
  (ДАЧвО-116-1 ≈1,400 справ, ДАЗкО-151-7, ДАПО Р-fonds, …);
- tier B0 (explicit `(опис)`-marker refs needing a new опис) matched 0 copies.

## Deliberately skipped

- **Bare 2-segment `фонд-N` refs** with no matching опис — ambiguous: N is often
  a справа with опис 1 elided (FS title `218-1-103` for ref `218-103`), sometimes
  a real опис (`ДАХмО-Р682-2`). Manual review territory (~hundreds).
- **ЦДНТА** everywhere (4-segment FS renumbering trap, see 2026-08-05 notes).

## Result

Unlinked pool: 141,521 → **77,579**. The remainder is unparseable/foreign refs
(PL\_… Polish sygnatury, title-only blobs), ЦДНТА, and the ambiguous 2-segment
family. No duplicate `full_code` introduced (verified 0).

Re-running either script is safe: candidates are recomputed from the current
unlinked pool and inserts are `ON CONFLICT DO NOTHING`.
