# 2026-08-31 — online_copies linking, round 2 (link-only)

Unlinked pool at start: **78,731** (was 68,497 after `2026-08-25-oc-linking-levels`,
minus the 810 of `2026-08-27-cdiak-128-zag-autolink`; the rest is FS growth since).
Re-running the current `/api/editor/online-copies/autolink` rules over that pool
matches only 1,090 copies — the residual is what the earlier READMEs said it was,
so this round adds **new parse rules** rather than re-running the old ones.

**Scope of this folder: LINK-ONLY.** A copy qualifies only when its code resolves
to an **already existing** file or inventory. The larger creation tiers found in
the same review (8,983 copies needing new files, 2,019 needing new описи) are
deliberately NOT here — see *Deferred* below.

## New rules (validated 2026-08-31)

| rule | what | copies | targets |
|------|------|--------|---------|
| **R0** | current autolink normalization **plus** `_` / `/` as segment separators and stray quote/backtick stripping | 1,693 file + 2 inv | 1,654 + 2 |
| **R1** | FS ref carrying `ф-о-с - description` (ЦДАМЛМ: `464-1-15932 - Тичина Павло Григорович - Фото…`) | 1,307 file | 1,302 |
| **R2** | FS ref carrying a single `Volume ф-о/с` (multi-Volume lists excluded) | 76 file | 31 |
| **R3** | FS ref in Latin `F.n-Op.m-D.k` form (ДАЗкО) | 100 file | 41 |

**3,178 copies mapped, 0 ambiguous.**

- R0's separator fix is the cheapest win: ДАОО (`2018_2_1937`) and ДАКО
  (`782_1_5388`) use underscores the current normalizer never collapses.
  That alone accounts for ~600 of R0's matches.
- R1 was spot-checked against catalog rows before queueing — FS ref
  `464-1-15932 - Тичина …` → `ЦДАМЛМ-464-1-15932`, correct across the sample.
- R2/R3 map several copies onto one file (76→31, 100→41). Checked: every copy
  has a **distinct url** — separate FS film items covering one справа, the normal
  multi-film pattern. No duplicate (resource, file, url) rows are introduced.

Guards, unchanged from earlier rounds: ЦДНТА excluded everywhere (172 candidates
dropped — its 4-segment FS codes are internal renumbering, 36/301 agreement
measured 2026-08-05); every match must hit exactly ONE target or it is dropped;
copies with a pending action are skipped, so re-runs can't double-propose.

## By archive (mapped copies)

ЦДАМЛМ 1,307 · ДАКО 497 · ЦДІАЛ 355+1inv · ЦДАВО 212 · ДАЗкО 169 · ДАКрО 107 ·
ДАОО 100+1inv · ДАЛО 93 · ДАМО 90 · ДАЧкО 73 · ДАТО 35 · ДАЧвО 32 · ЦДАГО 24 ·
ДАДнО 21 · ДАХО 12 · ДАК 11 · ДАХмО 9 · ЦДІАК 8 · ДАСО 7 · ДАІФО 5 · ДАВіО 4 ·
ДАДоО 4 · ДАРО 1

## `parsed` drift — duplicate copies (found during review, 2026-08-31)

`parsed` is part of `online_copies`' unique key
`(resource_id, inventory_id, file_id, parsed, url)`. FamilySearch re-scrapes
reword `parsed` for an **unchanged url** — `37_3_104` → `37-3-104_1805`,
`78-2-546г` → Latin `546g`, `Ф. 37, on. 3, д. 474` → `37_3_474`, a title filled
in later — so the ingest **inserts a twin row** instead of updating. The old twin
is already linked; round 2 matched the new one, which on accept would have put
two copies with one url on one target.

Measured against the queued round: **356 of 3,178** actions were such duplicates.
(Within-round duplicates: 0.)

**Skipping them is not enough.** The survivor would keep its stale `parsed`, so
the next sync would insert the twin again and the drift would recur every cycle.
So the group is *merged*: keep the linked survivor, give it the **latest**
`parsed`, delete the twins. The survivor then matches on the next sync and is
updated in place.

Guard on the refresh: the newer `parsed`, run through this round's own
normalization, must still resolve to the exact target the survivor is linked to.
Group membership is keyed on `(resource_id, url, target)` and one FS url can
legitimately span several справи, so without the check a survivor could adopt a
`parsed` describing a *different* справа. **355/355 agree exactly, 0 blocked.**

`00-candidates.sql` also carries the guard now (`t_dup_same`), so future runs
never queue these in the first place.

### Wider scope, not fixed here

The same drift has produced **32,148 redundant already-linked rows** across
**21,713 groups** database-wide (21,703 file + 10 inventory). `2026-08-25-fs-online-copies-dedup`
cleaned 2,327 pairs; it has regenerated ~14× that since, because the root cause
was never addressed. **The real fix is upstream:** the ingest should upsert on
`(resource_id, url)` and UPDATE `parsed`, rather than insert on `parsed` change.
Until then every sync keeps minting twins and any cleanup is temporary.

## Mis-parented existing links (21 actions held back)

21 queued actions have a url twin already linked to a different file with the
same опис and справа codes under **another fond**. All are ДАЧкО: fond `9310` is
an untitled 112-file artifact of an earlier create-missing round, while `931` is
the real fond ("Колекція. Метричні книги записів актів цивільного стану", 5,773
files). **Our match is the correct one** — but accepting it while the `9310` link
stands would show the copy twice, so `05-drop-mis-parented-actions.sql` holds
them back pending the fond cleanup (a separate call: delete or re-parent 9310).

Note the *other* 14 same-url-different-target cases are legitimate and stay
queued — one FS film genuinely spanning several справи (ДАІФО 631-1/597 vs 601,
ДАЧкО 403-2-6 vs 403-3-x, ДАОО 37-3-302 vs 303).

## Scripts

```sh
psql … -f 01-preview.sql                                            # read-only, writes audit/preview-links.csv
psql … -v who=script:2026-08-31-oc-link-r2 -f 02-create-actions.sql # PENDING actions + audit/created-actions.csv
psql … -v who=script:2026-08-31-oc-link-r2 -f 03-dedup-preview.sql  # read-only, writes audit/dedup-preview.csv
psql … -v who=script:2026-08-31-oc-link-r2 -f 04-dedup-execute.sql  # DESTRUCTIVE: merge drift twins
psql … -v who=script:2026-08-31-oc-link-r2 -f 05-drop-mis-parented-actions.sql
psql … -v who=script:2026-08-31-oc-link-r2 -f accept-actions.sql            # after review
psql … -v who=script:2026-08-31-oc-link-r2 -f rollback-pending-actions.sql  # undo pending
```

`00-candidates.sql` is the shared rule set, `\i`-included by both 01 and 02;
`03-dedup-groups.sql` is shared by 03 and 04. Preview and execute can't drift.

Note: once this round's actions are queued, `01-preview.sql` reports 0 mapped —
`t_un` skips copies that already have a pending action. That is the intended
"no double-proposing" guard, not a regression.

## Status

- [x] Preview run 2026-08-31 on prod — 3,178 mapped, 0 ambiguous.
- [x] 2026-08-31 — **3,176 file + 2 inventory PENDING `connect_to_online_copy`
      actions created** (`created_by = script:2026-08-31-oc-link-r2`).
      Audit: `audit/created-actions.csv`. Unlinked pool still 78,731 — nothing
      is linked until the actions are accepted.
- [x] 2026-08-31 — `parsed`-drift duplicates found in the queue (356) and the
      merge + guards written. Dedup preview run: 369 rows to delete (356 unlinked
      twins + 13 already-linked extras), 355 survivors reparsed, 0 blocked.
- [x] 2026-08-31 — `04-dedup-execute.sql` run: **369 duplicate copies deleted**
      (356 unlinked twins + 13 already-linked extras), **355 survivors reparsed**
      to the latest value, 356 round actions dropped, 0 actions needed
      repointing. Post-check `remaining dup groups in scope` = **0**.
      Audit: `audit/dedup-preview.csv`.
- [x] 2026-08-31 — `05-drop-mis-parented-actions.sql` run: **21 ДАЧкО actions
      dropped** across 18 target pairs. Audit: `audit/mis-parented-actions.csv`.
- [x] 2026-08-31 — **accepted**. `accept-actions.sql` linked **2,800 copies to
      files** and resolved 2,800 actions. The 1 inventory action
      (`ЦДІАЛ-201-4А`) had already been approved manually in the editor
      beforehand, so accept correctly skipped it as "linked some other way" —
      it is resolved, not pending. **0 actions left pending.**

| step | unlinked pool | pending actions |
|---|---|---|
| start | 78,731 | 3,178 |
| after `04-dedup-execute` | 78,375 | 2,822 |
| after `05-drop-mis-parented-actions` | 78,375 | 2,801 |
| measured after both | 78,378 ¹ | 2,801 ✓ |
| **after `accept-actions`** | **75,577** ✓ | **0** ✓ |

Post-checks: **0** new `(resource, url, target)` duplicate groups introduced by
this round; 0 actions left pending. Final catalog links: 2,964,384 copies on
files, 26,800 on inventories.

¹ 3 above the projection because an FS sync inserted 3 new unlinked copies at
17:00 while this migration was being prepared — not a discrepancy in the merge.

Global redundant linked rows: 32,148 → **32,135** (the 13 extras this round
collapsed). The remaining ~32k are outside this round's scope; see above.

## Deferred (found by the same review, not queued here)

- **Tier C — create file under an existing опис: 8,983 copies.** Concentrated:
  ДАМО 3,722 across 3 описи (Р5859 ЗАГС), ДАКрО 1,492 / 22, ЦДАМЛМ 1,169 / 128,
  ДАОО 1,124 / 10. ⚠ 16 candidates sit under **ДАЧвО-Н307**, a fond deliberately
  removed by `2026-08-25-dachvo-n307-fix` — exclude them.
- **Tier D — create опис under an existing fond: 2,019 copies.** ДАКрО 612 / 22,
  ЦДАГО 492 / 2, plus НМІУДСВ (below).
- **НМІУДСВ `ТФ-опис-справа` → fond `ТФ1` (R4, held back).** Parses 1,200 refs
  cleanly but 913 land on описи absent from `ТФ1` (catalog has 213 описи /
  4,813 files), and there is a letter-suffix conflict: FS `ТФ-5160-3a` vs
  catalog `НМІУДСВ-ТФ1-5160-3`. Needs a human decision before creating 47 описи.
- **Tier A — ~7,900 copies behind ~75 fonds absent from the catalog**: ДАЗпО
  2,779 (10 fonds), ДАТО 1,422 (4), ЦДАВО-Р4СЧ 1,059, ДАРО 1,013 (8), ДАМО
  Н-fonds 355 (19), ДАЧгО 341 (19). ДАМО already has 13 Н-fonds catalogued, so
  that prefix is legitimate. ⚠ Some entries in that list are parse artifacts, not
  fonds — `ДАЗПО-VОLUМЕ5593`, `ЦДІАЛ-V.701`, `ЦДАВО-5СЧ.`, `НМІУДСВ-ТФ`.

## Still unmappable (~57k, unchanged from earlier rounds)

38,629 FS blobs with empty ref **and** empty title (needs the olibNotes fallback)
— ЦДІАЛ 15,771 and ДАСО 9,372 are mostly these; ДАХмО 5,587 Polish `PL_…`
sygnatury and Dekanat titles; ЦДАМЛМ 3,688 six-digit FS internal numbers and
periodical titles; ДАПО 2,112 `№ NNN` refs; wiki ДАХО 955 П-fond 2-segment
refs; ДАКрО 150 junk/test rows (`1111test_uploading`, `--88, м. Знам'янка-`).
