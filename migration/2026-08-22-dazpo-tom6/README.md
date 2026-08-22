# ДАЗпО vs «Зведений каталог метричних книг», т. 6 (mbv6)

Research: `migration/acmb/research/mbv6-ДАЗпО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 50; B tagged | 118; D fond-year rows | 472; E removed | 4; H re-dated | 239; G retitled | 262; ROLLBACK

- A — справи created by опис: {'Р5593-2': 36, 'Р5593-3': 14}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 4 [['ДАЗпО-121-1-7338', 'ДАЗпО-121-1-7'], ['ДАЗпО-137-1-335', 'ДАЗпО-137-1-8'], ['ДАЗпО-157-1-321', 'ДАЗпО-157-1-10'], ['ДАЗпО-Р5593-2-135318', 'ДАЗпО-Р5593-2-135']].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 239, 'disjoint': 66, 'shifted': 23, 'typo>60y': 3} (the rest → editor review, `analysis/actions-ДАЗпО.json` → `year_disagree`).
- G — placeholder-title family: `^Метричні книги Православних церков$`.
- Excluded refs: none.

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
