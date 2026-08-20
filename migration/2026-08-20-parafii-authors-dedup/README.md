# 2026-08-20 — Parish authors dedup (bare imports → existing full titles)

## Problem

The `2026-08-20-parafii-authors` import inserted bare-settlement-titled
authors ("Якушинці") that duplicate pre-existing full-titled parish authors
("Миколаївська церква, с. Якушинці Вінницький повіт Юзвинська волость") —
trigram matching couldn't relate a bare name to a long title, so they
slipped past the import's enrich step. Reported by the user with the
Якушинці example.

## Detection

- Import set = current authors minus `pre-state-authors.csv` of the import
  migration (1,028); bare subset = titles without any church-type word
  (церква/костел/кірха/синагога/громада/собор/…): **721**.
- Candidate = pre-existing author whose title contains the settlement as a
  whole word (`\mНазва\M`, settlements ≥ 4 chars), **no confession-tag
  conflict**, and geo-confirmed (< 2 km) or, when the old author has no
  coords, the import's повіт appears in the old title.
- 351 bare imports had ≥1 candidate (1,398 raw pairs).

## Merge classes (196 auto-merged)

- `single` (177): exactly one valid candidate.
- `clones` (13): several candidates that are near-copies of each other
  (similarity > 0.7 — pre-existing duplicates in the old data, e.g. the two
  Якушинці churches differing only in волость/консисторія suffix) → merged
  into the geographically closest; the old-vs-old duplication itself is NOT
  touched here.
- `by_dedication` (6): several genuinely different churches in the village,
  but the import title carries the dedication ("Ковель,
  Христовоздвищенська" → "Церква Хресто-Воздвиженська, м. Ковель") — tie
  broken by full-title similarity (best > 0.3 and margin > 0.15 over the
  runner-up).

## What the merge did per pair (imp → old)

file_authors/case_authors moved to the kept author (`ON CONFLICT DO
NOTHING`; 163 imps carried file links from the parafii-file-authors batch),
old's missing coords filled from the import, tags unioned, import info
segments appended unless already present (Повіт: skipped when the повіт is
already in the old title), import author deleted.

## Left for manual review

- `review-ambiguous.csv` — **111 bare imports** with multiple valid
  candidates that are genuinely different churches (e.g. "Стадниця" with
  Дмитрівська + another church in the same village): can't tell which
  parish the confessional-book link belongs to without opening the source.
- 370 bare imports with no candidate at all (nothing to merge into) and the
  44 whose candidates all failed the guards — kept as standalone authors.
- Pre-existing old-vs-old duplicates surfaced by the `clones` class.

## Files

- `merge-list.csv` — the 196 applied pairs (source of truth).
- `review-ambiguous.csv` — the 111 unresolved imports with candidates.
- `pre-state-imp-authors.csv` / `pre-state-old-authors.csv` /
  `pre-state-file-authors.csv` / `pre-state-case-authors.csv` — full
  pre-merge snapshots of every involved row.
- `apply-authors-dedup.sql` — the merge (applied 2026-08-20).
- `rollback-authors-dedup.sql` — full restore from the snapshots.
