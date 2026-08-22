# ДАЧгО vs catalog — 887 справи in 4 fonds / 15 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 31 (by опис: [('679-1', 11), ('679-18', 7), ('712-1', 4), ('1462-1', 3), ('679-4', 2), ('679-16', 2), ('1530-2', 1), ('1530-4', 1)])
- file exists: 856 — no title 448, no «метрична книга» tag 846, no years 228, years disagree 26
    disagree: 679-1-74 DB 1914-1922 / catalog 1770-1787
    disagree: 1462-1-11499 DB 1776-1776 / catalog 1766-1766
    disagree: 1462-1-9475 DB 1856-1856 / catalog 1764-1764
    disagree: 679-1-349 DB 1763-1766 / catalog 1748-1766
    disagree: 679-1-126 DB 1718-1929 / catalog 1711-1711
    disagree: 679-1-121 DB 1785-1785 / catalog 1739-1785
    disagree: 679-1-346 DB 1763-1763 / catalog 1762-1762
    disagree: 679-5-7 DB 1781-1904 / catalog 1745-1745
    disagree: 679-5-16 DB 1781-1904 / catalog 1780-1780
    disagree: 679-1-415 DB 1775-1780 / catalog 1762-1780
    disagree: 679-1-175 DB 1794-1812 / catalog 1789-1789
    disagree: 679-1-75 DB 1914-1922 / catalog 1782-1782
- DB files in referenced описи not in catalog: 18168 (per опис: [(('1462', '1'), 14516), (('679', '1'), 1394), (('679', '14'), 671), (('1530', '2'), 519), (('679', '4'), 459), (('679', '12'), 312), (('679', '5'), 124), (('679', '18'), 60), (('679', '7'), 28), (('1530', '5'), 26)])
- suspicious high codes (>3× catalog max + 50): 31 e.g. [('679-13-85', '', ''), ('679-5-100', '1862-1865', ''), ('679-5-101', '1863-1870', ''), ('679-5-102', '1862-1872', ''), ('679-5-103', '1862-1862', ''), ('679-5-104', '1863-1870', ''), ('679-5-105', '1863-1870', ''), ('679-5-106', '1863-1870', '')]
- year-ordering inversions across referenced описи: 9932
- описи that look partially loaded (catalog cites справи the DB lacks): 4 → 679-1: DB 1619 files (max 2042), catalog 246 refs (max 15331), missing 11; 712-1: DB 60 files (max 311), catalog 38 refs (max 2311), missing 4; 679-4: DB 503 files (max 1686), catalog 54 refs (max 6271), missing 2; 1530-4: DB 4 files (max 114), catalog 1 refs (max 368), missing 1
- ACTIONS: create files 31, create описи [], add MK tag 846, fill years 227, fill title 448, fond years []
