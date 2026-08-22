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
