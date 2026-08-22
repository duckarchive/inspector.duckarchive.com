# ДАЧгО — mbv10-b3.pdf, printed pages 6–77 (pdf offset -8)

```
ДАЧгО: summary fonds 0 [] | blocks 221 | справи 362 | refs w/o ф. 0 (dropped 0) | multi-fond blocks 13 | confessions ['ІУДАЇЗМ', 'ПРАВОСЛАВ’Я', 'РИМО-КАТОЛИЦИЗМ']
   refs by fond: [('1530', 182), ('679', 94), ('Р72', 25), ('Р69', 16), ('Р5315', 14), ('Р63', 8), ('Р75', 6), ('Р17', 5), ('Р67', 5), ('Р16', 2), ('Р76', 1), ('Р8994', 1)]
   описи per fond: {'Р76': 1, '679': 8, 'Р8994': 1, 'Р17': 1, 'Р5315': 1, 'Р63': 1, 'Р67': 1, 'Р16': 1}
```

# ДАЧгО vs catalog — 362 справи in 15 fonds / 22 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 36 (by опис: [('Р72-1', 8), ('679-18', 5), ('Р69-1', 5), ('679-19', 4), ('Р5315-2', 4), ('Р67-1', 4), ('Р75-1', 3), ('Р63-1', 2), ('Р292-5', 1)])
- file exists: 326 — no title 9, no «метрична книга» tag 14, no years 6, years disagree 22
    disagree: Р8994-1-74 DB 1928-1928 / catalog 1928-1931
    disagree: Р69-1-526 DB 1925-1925 / catalog 1925-1929
    disagree: Р72-1-221 DB 1927-1927 / catalog 1925-1927
    disagree: Р69-1-457 DB 1927-1927 / catalog 1927-1929
    disagree: Р72-1-231 DB 1928-1928 / catalog 1925-1928
    disagree: Р69-1-459 DB 1925-1925 / catalog 1925-1929
    disagree: Р69-1-485 DB 1927-1927 / catalog 1925-1929
    disagree: Р69-1-464 DB 1925-1925 / catalog 1925-1929
    disagree: Р69-1-466 DB 1925-1925 / catalog 1925-1929
    disagree: 1530-6-49 DB 1874-1874 / catalog 1855-1874
    disagree: 1530-6-50 DB 1874-1874 / catalog 1858-1874
    disagree: 1530-6-43 DB 1873-1873 / catalog 1872-1872
- DB files in referenced описи not in catalog: 11985 (per опис: [(('679', '2'), 5163), (('679', '10'), 4034), (('679', '1'), 1628), (('679', '12'), 299), (('Р8994', '1'), 250), (('128', '1'), 184), (('1530', '6'), 113), (('679', '19'), 99), (('679', '18'), 60), (('Р69', '1'), 42)])
- suspicious high codes (>3× catalog max + 50): 833 e.g. [('128-1-13863', '', ''), ('128-1-13869', '', ''), ('128-1-13870', '', ''), ('128-1-13876', '', ''), ('128-1-13877', '', ''), ('128-1-13912', '', ''), ('128-1-13969', '', ''), ('128-1-14074', '', '')]
- year-ordering inversions across referenced описи: 3831
- описи that look partially loaded (catalog cites справи the DB lacks): 6 → Р72-1: DB 29 files (max 273), catalog 25 refs (max 275), missing 8; Р69-1: DB 23 files (max 526), catalog 16 refs (max 536), missing 5; Р5315-2: DB 14 files (max 120), catalog 14 refs (max 121), missing 4; Р67-1: DB 4 files (max 271), catalog 5 refs (max 477), missing 4; Р75-1: DB 5 files (max 176), catalog 6 refs (max 184), missing 3; Р292-5: DB 0 files (max 0), catalog 1 refs (max 10), missing 1
- ACTIONS: create files 36, create описи [], add MK tag 14, fill years 6, fill title 9, fond years []

## Title patterns among catalog-referenced files that are not «Метрична книга. …» (256)
- 52 × `Метрична книга євреїв м. Прилуки. Смерть`
- 50 × `Метрична книга євреїв м. Прилуки. Народження`
- 45 × `Метрична книга євреїв м. Прилуки. Шлюб`
- 32 × `Метрична книга євреїв м. Прилуки. Розлучення`
- 25 × `Метрична книга про народження м. Ніжин`
- 9 × `<empty>`
- 6 × `Метрична книга про смерть м. Козелець`
- 5 × `Метрична книга про розірвання шлюбів м. Козелець`
- 4 × `Метрична книга про народження євреїв м. Козелець`
- 4 × `Метрична книга про шлюби м. Козелець`
- 2 × `Метрическая книга еврейского общества о Брак. Прил`
- 2 × `Метричні книги записи народжень євреїв м. Чернігів`

DB files in referenced fonds: 17634. Work dir: `work/mbv10-b3-ДАЧгО/` (text, parsed json, DB snapshots, actions-ДАЧгО.json).
