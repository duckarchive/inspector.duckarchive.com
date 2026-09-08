# 2026-09-08 — ПЕРІОДИКА ф. 2 «Єпархіальні Відомості»: описи, справи, онлайн-копії

Source: [`uk.wikisource.org/wiki/Архів:Єпархіальні_Відомості`](https://uk.wikisource.org/wiki/Архів:Єпархіальні_Відомості)
— an index page linking 10 eparchy subpages, each one wikitable of year × issue
(12 column-slots per month). Applied to prod **2026-09-08**.

The fond itself (`8775ebfa-04ab-44e3-bea9-137704f39b06`) already existed and was
empty; this migration fills it.

## Structure

Eparchy is the second dimension ПЕРІОДИКА's usual `фонд = газета / опис = рік`
shape has no room for, so it was given to the опис level, with incremental codes:

| level | code | example |
|---|---|---|
| опис | `1`…`10`, in the index page's own (alphabetical) order | `4` = Київські |
| справа | incremental within its опис, ordered by year then column position | `ПЕРІОДИКА-2-1-1` |

Titles carry the edition's own historical name: `Волынскія Єпархіальныя
Ведомости №1 1867`. Опис titles pair the modern Ukrainian name with it —
`Волинські Єпархіальні Відомості (Волынскія Єпархіальныя Ведомости)`.

## What was created

10 описи · 14 065 справи · 14 065 `file_years` · 7 863 `online_copies`
(7 853 file-level + 10 inventory-level), all on resource `wiki`
(`12766f78-…`), `availability = PUBLIC`, `parsed = source_key = full_code`.

| опис | видання | роки | справи | скановані |
|---|---|---|---:|---:|
| 1 | Волинські | 1867–1917 | 1 686 | 1 685 |
| 2 | Донські | 1869–1917 | 1 405 | 0 |
| 3 | Катеринославські | 1872–1917 | 1 310 | 0 |
| 4 | Київські | 1861–1917 | 1 839 | 1 839 |
| 5 | Подільські | 1862–1905 | 1 247 | 1 247 |
| 6 | Полтавські | 1863–1917 | 1 495 | 473 |
| 7 | Таврійські | 1869–1917 | 1 272 | 1 272 |
| 8 | Харківські | 1867–1915 | 1 186 | 0 |
| 9 | Херсонські | 1860–1918 | 1 334 | 1 334 |
| 10 | Чернігівські | 1861–1911 | 1 291 | 0 |

Online copies are of two kinds:

- **справа → Commons PDF**, e.g. `https://commons.wikimedia.org/wiki/File:Волынскія_Єпархіальныя_Ведомости_№16_1890.pdf`.
  Three issues (Волинські 1880 №13-14 and 1882 №29, Київські 1874 №3) carry a
  second PDF — the issue's «додаток» — as an extra row with
  `parsed = '<full_code> (додаток)'`, hence 7 853 rows over 7 850 scanned справи.
- **опис → its Wikisource index page**, e.g.
  `https://uk.wikisource.org/wiki/Архів:Єпархіальні_Відомості/Волинські`.
  URLs are stored with unencoded Cyrillic and `_` for spaces, matching the
  existing `wiki` rows.

## ⚠️ Four edition names are constructed, not sourced

Донські, Катеринославські, Харківські and Чернігівські have **no scans at all**
on Wikisource, so their subpages contain nothing but the bare table — no edition
name anywhere, and Commons has no files to read one from. Their names in the six
scanned описи all follow one pattern (`<Rus. adjective> Єпархіальныя
Ведомости`), and the four missing ones were written to match it:

- `Донскія Єпархіальныя Ведомости`
- `Екатеринославскія Єпархіальныя Ведомости`
- `Харьковскія Єпархіальныя Ведомости`
- `Черниговскія Єпархіальныя Извѣстія` — **Извѣстія**, not Ведомости; the index
  page annotates this one «Чернігівські Єпархіальні Вісті (аналог Відомостей)»

That is 5 192 справа titles (описи 2, 3, 8, 10) resting on an unsourced spelling.
Worth confirming against a bibliography; a correction is a single `UPDATE` per
опис over `files.title`.

## Notes on the source

- The tables place each issue in one of 12 slots per month, so the **month is
  inferable but the day is never recorded** — unlike the rest of ПЕРІОДИКА
  (`Діло, № 25, 04.02.1932`), titles here stop at the year rather than invent a
  date. `file_years` gets `start = end = <рік>`.
- Every issue label parsed as a plain number or hyphenated range (`13-14`,
  `13-14-15-16-17-18`); no free text, no `(year, issue)` duplicate within an
  eparchy, so incremental codes were not strictly needed for uniqueness.
- Unscanned issues are listed as plain table cells and were created as справи
  too — they document the holdings; only the link is missing.

## Files

| file | |
|---|---|
| `00-parse.py` | wikitext → `rows.json` (fetch the 10 subpages with `?action=raw` first) |
| `gen.py` | `rows.json` → the four CSV payloads |
| `01-inventories.csv` … `04-file-copies.csv` | the payload actually loaded |
| `migration.sql` | guarded single transaction; `\copy` into temp tables, then insert. Ends in `COMMIT` |
| `rollback.sql` | deletes everything under фонд 2 (safe — it was empty before) |
| `apply.log` | the applying run |

`migration.sql` guards on: фонд exists by id and has 0 описи, `wiki` resource
exists, payload row counts are `(10, 14065, 10, 7853)`; and asserts the same
counts back out before committing. Re-running it is refused by the empty-фонд
guard, not silently duplicated. ~35 s.

Applied with a role that can create temp tables — the repo's usual `.env` role
could not (`permission denied to create temporary tables`).

## Follow-up

The 10 index-page URLs were normalised to unencoded form in a second statement
after the main apply; `gen.py` and `03-inventory-copies.csv` were then synced, so
a fresh run of the pipeline reproduces the committed state in one pass.
