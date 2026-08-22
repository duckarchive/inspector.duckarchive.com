# ДАХО vs «Зведений каталог метричних книг», т. 5 (mbv5-b1, mbv5-b2)

Research: `migration/acmb/research/mbv5-b1-ДАХО.md`, `migration/acmb/research/mbv5-b2-ДАХО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 1363; B tagged | 91; D fond-year rows | 6; E removed | 1; H re-dated | 97; G retitled | 83; ROLLBACK

- A — справи created by опис: {'40-105': 581, '40-109': 261, '40-110': 207, '40-112': 160, '40-113': 151, '40-133': 2, '40-260': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 1 [['ДАХО-40-109-1355478', 'ДАХО-40-109-1355']].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'disjoint': 148, 'shifted': 8, 'DB⊂catalog': 98, 'typo>60y': 3} (the rest → editor review, `analysis/actions-ДАХО.json` → `year_disagree`).
- G — placeholder-title family: `^Метричні книги православних церков .*$`.
- Excluded refs: none.
- опис 40-614 skipped (1 ref(s) — likely a typo)

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
