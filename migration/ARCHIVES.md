# Per-archive sub-plans

Legend:
- **junk** — codes not matching `^[А-ЯҐЄІЇ]{0,3}\d+[А-ЯҐЄІЇ]{0,5}\d*$` (need manual mapping decision)
- **Т-cases / Т-descs** — codes containing volume markers `Т#`/`ТОМ#`
- **merge groups** — codes colliding after normalization (must merge into one instance)
- **old / new copies** — `case_online_copies` rows / `file_online_copies` rows whose `parsed` starts with this archive code

## Group A — pilot (tiny, no anomalies)

| Archive | Funds | Descs | Cases | Old copies | New copies | Notes |
|---|---|---|---|---|---|---|
| ГДАМВС | 1 | 1 | 1 | 1 | 1 | trivial smoke test |
| ГДАСЗРУ | 1 | 1 | 1 | 1 | 1 | trivial |
| ДАС | 56 | 72 | 2 | 2 | 2 | junk funds: `ВИДАННЯ`, `КМФ` (bare, no number) |
| ГДАСБУ | 36 | 10 | 104 | 104 | 40 | 24 Т-cases, no collisions |
| ЦДАЗУ | 2 | 0 | 0 | 0 | 0 | fund `А` («Архівні фонди») — junk, no children |

## Group B — special mechanics (run early, one by one)

### ДАДнО — 9,798 cases — tests fond/inventory UPSERT
- New structure already has **4,539 fonds + 5,869 inventories** (fresh scrape, v2 codes); 3,865 fonds match legacy codes, **674 are new-only** (don't touch), legacy has ~62 funds absent in new (insert).
- 0 files exist → file inserts are clean.
- Fund patterns: `Р#`, `Н#`, `Р#С`, `Р#СЧ`. Desc patterns incl. `#Д`, `#ДТ#`, `#ОС`, `#ОСД`, `#ДПР`, `#ЛД` — verify against existing v2 inventory codes (`#ДОД` form) before upserting.
- 266 Т-descs, 8 Т-cases, no collisions.
- 14,943 old copies vs 27,496 new — big new-only tail (fresh ARCHIUM scrape).

### ЦДІАК — 283,987 cases — tests file UPSERT + Т/ТОМ desc merge
- Fond `442` + 70 inventories + **41,287 files already exist** (only 8,781 match legacy full_codes; 32.5k are new-only — leave).
- **9 Т/ТОМ description merge groups in fund 486**: `1Т1-4,7-9`, `3Т1-2` — 6 child-code conflicts (1164, 5318, 16071, 18638, 349) with identical titles → auto-merge, newest wins.
- 1 case pair `17н`/`17Н` (fund 1350 desc 1).
- **24 junk descs**: `1ГРАМОТИ`, `1018КОМІТЕТ`, `1027РЕЄСТРИ`, `1АЛПХАБЕТ`, `#КАНЦЕЛЯРІЯ` (×3), `#А4СТІЛ`/`#А1СТІЛ`/`#Б2СТІЛ`/`#В2СТІЛ` (×13, "стіл" = court desk structure), `ФИЛЕС` ×6 (empty titles — candidates to skip).
- **11 junk cases**: `Ф127ОП191ПДФ`…`196ПДФ` («Недіючий опис» — full-reference codes, candidates to skip/remap), `1ПРОДОЛЖ`, `21Ч2Б`, `Б`, `ВОТ`, `17н`.
- Desc suffixes to preserve: `#ВОТ#`, `#СТІЛ` variants — these are real structural units.
- Fund prefix `КМФ#` (microfilm collections).

### ДАХмО — 187,657 cases — tests case-level ТОМ merge
- **7 case merge groups in 226-79**: `5146Т1-2`+`ТОМ`, `5172Т1-5`+`ТОМ` (14 rows, identical titles).
- 1,145 Т-cases total — volume-heavy archive; clean otherwise (0 junk).
- 220k new copies ≥ 207k old — good parsed-matching potential.

### ЦДАВО — 204,348 cases — tests н/Н lowercase merge
- **12 desc merge groups in fund 8**: `1н`–`12н` vs `1Н`–`12Н` (titles «Опис N.»).
- 2 case pairs: `803н/803Н`, `906н/906Н` (ЦДАВО-2-15).
- 1,547 Т-descs (most in DB) — but zero collisions.
- Junk: desc `1СТИМЧЗБ`; fund patterns `#ОС`, `#С`, `#СЧ` suffixes (особовий склад etc.) — preserve.
- Known parseCode hack: `10.` → `10н` came from e-resource.tsdavo.gov.ua (see parse.ts comment) — the н-suffix descs are that artifact.

## Group C — bulk, minor quirks (ascending size)

| Archive | Cases | Anomalies / notes |
|---|---|---|
| ЦДНТА | 2,055 | clean; fund codes `Р#` only |
| ЦАЗУНР | 2,371 | 291 Т-cases, no collisions |
| НМІУДСВ | 2,434 | fund prefix `ТФ#` (unique to this museum) |
| ДАК | 1,387 | clean; `#ОС` descs |
| ДАДоО | 4,027 | clean |
| ДАЛуО | 4,447 | junk fund `ДС` («до 1917 у Сєвєродонецьк») — real fund, keep |
| ДААРК | 6,432 | junk funds: `НЕВІДОМИЙ`, `НЕВІДОМИЙ2`, `НН`, `ВИДАННЯ` — real children, migrate as-is; only 1,334 new copies (FS composite parsed) |
| ДАХО | 6,762 | clean |
| ДАІФО | 7,687 | 119 Т-cases, no collisions |
| ДАЗпО | 17,800 | clean; fund `#Н` suffix |
| ДАВоО | 16,356 | `#Т#` descs (1), clean |
| ДАЖО | 21,044 | junk fund `ВИДАННЯ`; `#Д` descs |
| ДАВіО | 25,200 | 65 Т-cases |
| ДАСО | 25,981 | `#Ч#` descs (частина) |
| ДАОО | 28,972 | junk fund `ВИДАННЯ`; desc suffixes `#Т#`, `#Ч#`, `#ЧІІ` (roman-numeral-ish part) |
| ДАТО | 34,355 | junk fund `Н` (bare) |
| ДАЧкО | 38,542 | junk funds `БІБЛ`, `ДАЧО8`, `ДАЧО712`, `ДАЧО841` (self-referencing prefix — strip `ДАЧО`?) |
| ДАХеО | 43,661 | junk cases `СПРАВ`, `ЦПРАВА13/36/232` (typo «справа»→remap to numeric?); junk fund bare `Р` |
| ДАРО | 50,454 | junk fund `ВИДАННЯ` |
| ДАЧгО | 58,154 | junk cases `#ФОТОАЛЬБОМ` ×5, `115ЩОДЕННИК` — descriptive suffixes, decide keep/trim |
| ДАЗкО | 62,208 | junk case `БН` (без номера) |
| ДАМО | 65,298 | junk fund bare `А` (алфавітні покажчики — real, keep); fund `#Н` suffix |
| ДАЧвО | 95,290 | clean; only 30 funds but 95k cases |
| ЦДІАЛ | 101,738 | 249 Т-cases; desc letter-postfix alphabet `#А`–`#К` heavily used; fund `#ЧТ` suffix |
| ЦДАГО | 137,034 | **31,324 Т-cases** (`64038Т1` style, multi-volume personal files) — biggest Т→ТОМ conversion impact; 1 junk `64038Т1А` (Т+letter combo); only 18k new copies vs 137k old |
| ЦДАМЛМ | 154,269 | junk: fund `БІБЛ`, cases `20н`/`20Н` merge pair + `БН` ×2 (two different albums, same code «без номера» — conflict file) |
| ДАКрО | 204,031 | junk: fund `"514 "` (trailing space — trim), bare `П`, desc `ТЕСТ` (skip); 503 Т-cases; desc pattern `#РТ#`, `#ТІІ`; fund suffixes `Р#Е`, `Р#И`, `Р#Ц` |
| ДАЛО | 275,002 | junk cases `-17781` etc. ×6 (dash prefix — strip to numeric; check collision with existing numeric codes); desc suffix zoo: `#АДЗ`, `#ДГ`, `#ДЗ`, `#ДТ`, `#ЗК`, `#ЛК` — preserve; 263k old vs only 39k new copies (e.archivelviv barely rescraped) |
| ДАКО | 287,188 | junk: desc `1ДАТКОВИЙ` (= 1 додатковий → `1ДОД`?), case `181ДРУГАСПРАВА` (remap `181Б`?); desc patterns `#ДАТК`, `#ДАТКОВИЙ`, `#ДСК`, `#ДСКТ`, `#СВ`, `#СТ`; fund `ФП#`, `У#`, `Р#С`, `Р#СЧ` |
| ДАПО | 491,781 | biggest archive; junk funds: `БІБЛ`, `#БІБЛ`, `Г`, `Н`, `Р` (bare), `СПЕЦ`; desc `#ВСП`, `С#` (prefix С!); 519k old copies — largest online-copy migration |

## Copy-matching notes per resource type

| Type | Old copies | New copies | Match strategy |
|---|---|---|---|
| FAMILY_SEARCH | 1.95M | 1.98M | url match first; `parsed` composite format `АРХ-(f-d+++f-d+++f-d_years)` needs dedicated parser |
| ARCHIUM | 1.12M | 339k | plain `АРХ-Ф-ОП-СПР` parsed; large old-only tail → Phase-3 step 3 inserts |
| WIKIPEDIA | 130k | 132k | plain parsed; near 1:1 |
| BABYN_YAR | 46k | 0 | old-only → insert with mapped file_id |
| WEBSITE | 38k | 0 | old-only → insert |
| GOOGLE_DRIVE | 7.4k | 0 | old-only → insert |
