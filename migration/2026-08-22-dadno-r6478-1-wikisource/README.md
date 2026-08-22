# ДАДнО Ф. Р-6478 оп. 1 — titles/years corrected from Wikisource

Source: the manually verified tables at `uk.wikisource.org/wiki/Архів:ДАДнО/Р-6478/1` (37 volume subpages; filled: т. 1 partial, т. 14/15/37 a few rows, т. 16–20 complete — 14 600 rows in total). The DB rows of this опис came from OCR with row shifts (a file carrying the name/years of the neighbouring справа).

Method: rows matched by справа number; names compared as token sets after folding Latin homoglyphs; a row is "the same person" at Jaccard ≥ 0.5 (formatting differences — uppercase surname, brackets, slashes — are left alone). Otherwise the Wikisource title wins; years are replaced wherever they differ.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- 340 titles replaced (person differed → the OCR shift), 504 year sets replaced: `01-updates.csv` (with old/new values, reason, volume, similarity).
- 15 справи created that Wikisource lists and the DB lacked (`02-create.csv`).
- Latin homoglyphs inside Cyrillic names folded to Cyrillic across the whole опис.
- 13 948 rows already matched; ~30 titles in the 0.4–0.5 similarity band were replaced too (same person, corrected spelling on Wikisource, e.g. `68170 ТАКАЧЕНКО РАІСА НИКОЛІРОВНА → Ткаченко Раіса Никифорівна`).

Not covered: volumes 3–13, 21–36 have no tables on Wikisource yet; the shift there (if any) remains.
