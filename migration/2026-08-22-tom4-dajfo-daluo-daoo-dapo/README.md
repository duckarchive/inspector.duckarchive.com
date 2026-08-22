# ДАІФО / ДАЛуО / ДАОО / ДАПО vs «Зведений каталог метричних книг», т. 4 (2012) — anomaly report

Source: `tom4.pdf` via pdftotext — ДАІФО p. 228–310 (833 справи, collection Ф. 631 + 594/9), ДАЛуО p. 312–455 (2 639, Ф. 126, 30 описи), ДАОО p. 457–521 (1 072, Ф. 37/39/628/920/921/923), ДАПО p. 522–733 (4 325, Ф. 706/801/1011/1072). Parser/compare in `analysis/` (`parse_v4.py`, `compare_v4.py`, `actions-*.json`, DB snapshots). Unlike ДАДоО these are collection fonds, so everything is справа-level; titles/years in the DB are essentially complete.

Print typos mapped: ДАІФО `ф. 831`→631, `ф. 5941`→594, `спр. 528ь`, `спр. 6837`; ДАПО `ф. 101/10111/1001`→1011. Catalog letter codes folded to uppercase (`оп. 3а` = DB `3А`).

| | ДАІФО | ДАЛуО | ДАОО | ДАПО |
|---|---|---|---|---|
| catalog справи | 833 | 2639 | 1072 | 4325 |
| missing in DB → create (A) | 0 | 22 | 1 | 0 |
| no «метрична книга» tag → add (B) | 35 | 0 | 21 | 29 |
| bare years / title → fill (C) | 2 | 0 | 0 | 0 |
| fonds w/o years → fill from header (D) | 0 | 0 | 4 | 0 |
| glued duplicates → delete (E) | 0 | 5 | 1 | 0 |
| fond `5941` → merge into 594-1-45 (F) | 1 | 0 | 0 | 0 |
| placeholder titles the catalog can name (G) | 757 | 0 | 672 | 4 365 |

## Year disagreements — report only (`analysis/actions-*.json` → `year_disagree`)
ДАІФО 73 (52 catalog-wider, 10 catalog typos with a >60-year span, 8 shifted, 3 disjoint); ДАЛуО 32 (all catalog end-year later than the опис — looks like a systematic +1…+8 years); ДАОО 47 (21 catalog-wider, 7 typos like `1826–1926`, 17 disjoint); ДАПО 173 (89 disjoint — mostly Ф. 801 оп. 1 off by one year, 81 catalog-wider). Not applied; the DB side matches the archive's описи.

## Files
- `migration.sql` — A–F in one guarded transaction (dry-run: 23 files created, 85 tagged, 4 fond-year rows, 7 merges).
- `migration-titles.sql` — G: 3 070 `Церковні документи / 1750-1918` / `Метричні книги Православних церков` titles → `Метрична книга. <церква, місце>` from the catalog (dry-run OK). Separate on purpose — it rewrites existing titles.
- `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv` — row-level inputs; `analysis/report-*.md` — raw comparison per archive.

**Status: A–F and G applied to prod on 2026-08-22** — 23 files created, 85 files tagged, 4 fond-year rows, 7 merges (6 duplicates + fond 5941), 3 070 + 2 658 titles replaced (second pass added the FamilySearch collection-name placeholders «Metrical Books and Clergy Records, Poltava» / «Метричні книги, Nobility Records…» in ДАПО). Year disagreements remain report-only.
