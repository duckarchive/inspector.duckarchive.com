# ДАЖО vs «Зведений каталог метричних книг», т. 9 (mbv9-b1, mbv9-b2)

Research: `migration/acmb/research/mbv9-b1-ДАЖО.md`, `migration/acmb/research/mbv9-b2-ДАЖО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 402; B tagged | 2806; H re-dated | 2715; G retitled | 2939; ROLLBACK

- A — справи created by опис: {'1-76': 189, '1-75': 85, '1-7': 18, '1-74': 13, '1-78': 11, '1-87': 9, '1-77': 5, '643-1': 4, '579-1': 3, '590-1': 3, '644-1': 3, '672-1': 3}; описи created: ['1-768', '420-74'].
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 2804, 'disjoint': 559, 'typo>60y': 186, 'shifted': 332} (the rest → editor review, `analysis/actions-ДАЖО.json` → `year_disagree`).
- G — placeholder-title family: `^(Метрична книга|Метричні книги православн.*|Метричні книги про народження, шлюб, смерть по цер.*)$`.
- Excluded refs (year printed as a справа number / glued code): ['1-7-1860', '1-7-1865', '1-7-1872', '1-7-1881', '1-7-1888', '1-76-1810', '1-76-1843', '1-76-1850', '1-76-1872', '1-76-1873', '1-84-1810', '1-84-1920', '1-91-1833', '1-91-1842', '1-91-1852']….

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
