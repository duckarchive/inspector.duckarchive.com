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

## Round 2 (applied 2026-08-20) — file-link overlap

The user reported two survivors ("Носківці", "Стадниця"), both parked in
round 1's ambiguous list. The signal round 1 lacked: every bare import
carries the file link from `2026-08-20-parafii-file-authors` (registry URL
→ DGS → online_copy → file). **If a candidate is already attached to that
same file, both are documented in the same confessional book** — decisive
evidence of the same parish. Of the 111 ambiguous imports, 91 had a file
link and 51 shared it with ≥1 candidate; **48 merged**:

- `shared_file` (36) — exactly one candidate shares the file.
- `shared_file+dedication` (12) — several share it, but the import title
  names its own dedication ("Пиків (містечко), Свято-Покровська" →
  "Покровська церква, м. Пиків"), picking exactly one. All 12 were
  eyeballed against their rejected same-file rivals; the rivals are
  genuinely different churches.

The rule reproduced both user-reported pairs without being tuned to them
(Носківці → "Різдво-богородична церква … Станіславчицька волость",
Стадниця → "Дмитрівська церква … Стрижавська волость"), and those targets
are also the best-attested authors (29 and 24 files respectively).

## Left for manual review

- `review-ambiguous.csv` — the **63 imports still unresolved** after round
  2: no candidate shares their file (or they have no file link at all), and
  the village genuinely holds several churches. Sorted by shared_files then
  old_files so the likeliest target is first per import.
- **Pre-existing old-vs-old duplicates** are now the visible remainder, e.g.
  "Дмитрівська церква, с. Стадниця … Стрижавська волость" (24 files) vs
  "Дмитріївська церква, с. Стадниця … Подільська губернія" (4 files), and
  the two Носківці Різдво-Богородиц* rows. These predate the parish import
  — a `волость`-suffixed series with консисторія info (3,799 authors) and a
  `губернія`-suffixed one without (1,065) — and need their own dedup pass.
- 370 bare imports with no candidate at all (nothing to merge into) and the
  44 whose candidates all failed the guards — kept as standalone authors.
- Pre-existing old-vs-old duplicates surfaced by the `clones` class.

## Files

- `merge-list.csv` — round 1's 196 applied pairs (source of truth).
- `merge-list-round2.csv` — round 2's 48 applied pairs.
- `*-round2.sql` / `pre-state-*-round2.csv` — round 2's apply, rollback and
  snapshots (same shape as round 1; run round 2's rollback first if undoing
  both).
- `review-ambiguous.csv` — the 63 imports still unresolved after round 2.
- `pre-state-imp-authors.csv` / `pre-state-old-authors.csv` /
  `pre-state-file-authors.csv` / `pre-state-case-authors.csv` — full
  pre-merge snapshots of every involved row.
- `apply-authors-dedup.sql` — the merge (applied 2026-08-20).
- `rollback-authors-dedup.sql` — full restore from the snapshots.
