# 2026-08-20 — Parish authors → file_authors via DGS

## What

Links the parish authors imported in `2026-08-20-parafii-authors` to the
files that hold their confessional records, using the FamilySearch registry
URLs stored in `authors.info` ("Реєстр: …").

## Chain

1. `authors.info` → registry URL. Of 1,185 parish authors: **337
   FamilySearch ark URLs** (this batch), 415 daro-metric-map (separate
   project — explicitly out of scope per user), 274 regestry.lubgens.eu,
   18 Google Docs, 3 cdiak, 138 non-URL registry notes.
2. FS URL `groupId=TH-…` (film-level APID) → DGS via
   `GET https://www.familysearch.org/das/v2/apid:<groupId>/name?namespace=dgs`
   (same API as `scripts/to-dgs.ts`; browser User-Agent required, no auth).
   337 URLs collapse to **24 unique films** — one film = one confessional
   book covering one-to-many parishes.
3. DGS → `online_copies.url` `imageGroupNumbers=<DGS>` (numeric,
   padding-insensitive match) → `file_id`. **All 24 DGS matched exactly one
   linked online_copy each**, across ДАХмО (ф. 315), ДАЖО (ф. 1), ДАВоО
   (ф. 193).
4. `INSERT INTO file_authors (file_id, author_id)` — 337 pairs, 0
   pre-existing, `ON CONFLICT DO NOTHING`.

## Sanity checks

- 15 files are per-parish books (exactly 1 author) and the names align,
  e.g. author "Свійчів" → "Книга сповідних парафіян церкви с. Свійчів
  Володимир-Волинського повіту".
- Повіт-wide books correctly take many parishes: ДАХмО-315-1-8563
  "Сповідальні розписи церков Ямпільського повіту. Села А–М" ← 63 authors;
  ДАХмО-315-1-11912 (Вінницький повіт, М–Я) ← 58.

## Files

- `author-file-mapping.csv` — the 337 verified pairs with author/file
  titles, groupId, DGS, online_copy_id (source of truth for apply/rollback).
- `apply-parafii-file-authors.sql` — the INSERT (applied 2026-08-20).
- `rollback-parafii-file-authors.sql` — deletes exactly those pairs.

## Not covered (future work)

- 415 daro-metric-map parish URLs — separate project, per user decision.
- 274 lubgens + 18 Google Docs + 3 cdiak + 138 non-URL registries — no
  DGS-based path; would need per-source handling.
- No inventory-level author links exist in the schema (only
  `file_authors`/`case_authors`), so mapping stops at files.
