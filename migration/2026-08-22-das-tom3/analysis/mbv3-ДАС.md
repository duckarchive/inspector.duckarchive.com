# ДАС — mbv3.pdf, printed pages 695–715 (pdf offset +0)

```
ДАС: summary fonds 0 [] | blocks 38 | справи 328 | refs w/o ф. 0 (dropped 0) | multi-fond blocks 5 | confessions ['ПРАВОСЛАВ’Я']
   refs by fond: [('30', 153), ('23', 73), ('11', 37), ('3', 30), ('33', 9), ('5', 8), ('35', 6), ('34', 6), ('9', 6)]
   описи per fond: {'5': 1, '11': 1, '23': 1, '30': 1, '35': 1, '33': 1, '34': 1, '9': 1}
```

# ДАС vs catalog — 328 справи in 9 fonds / 9 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 6 (by опис: [('11-1', 6)])
- file exists: 322 — no title 0, no «метрична книга» tag 0, no years 0, years disagree 1
    disagree: 30-1-36 DB 1896-1896 / catalog 1843-1896
- DB files in referenced описи not in catalog: 5 (per опис: [(('30', '1'), 4), (('11', '1'), 1)])
- suspicious high codes (>3× catalog max + 50): 0 e.g. []
- year-ordering inversions across referenced описи: 4
- описи that look partially loaded (catalog cites справи the DB lacks): 0 → 
- ACTIONS: create files 6, create описи [], add MK tag 0, fill years 0, fill title 0, fond years []

## Title patterns among catalog-referenced files that are not «Метрична книга. …» (32)
- 30 × `Метрична книга`
- 1 × `Метричні книги православних церков Трьохсвятительс`
- 1 × `Метричні книги православних церков Миколаївської м`

DB files in referenced fonds: 329. Work dir: `work/mbv3-ДАС/` (text, parsed json, DB snapshots, actions-ДАС.json).
