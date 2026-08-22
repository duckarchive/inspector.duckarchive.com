# ДАЧгО vs catalog — 10034 справи in 9 fonds / 30 описи
- fond missing in DB: 3 → fonds ['6779', '69']
- inventory missing in DB: 0 → описи []
- file missing in DB: 1106 (by опис: [('1530-2', 644), ('679-18', 196), ('679-15', 67), ('679-16', 45), ('1530-4', 44), ('679-10', 23), ('1462-1', 17), ('1530-1', 16), ('679-1', 14), ('1530-3', 11), ('679-12', 11), ('679-4', 6), ('679-17', 6), ('1530-5', 2), ('Р67-2', 1)])
- file exists: 8925 — no title 5432, no «метрична книга» tag 8819, no years 3357, years disagree 114
    disagree: 679-1-80 DB 1830-1841 / catalog 1800-1829
    disagree: 679-1-77 DB 1914-1922 / catalog 1798-1834
    disagree: 679-1-138 DB 1779-1804 / catalog 1801-1836
    disagree: 1462-1-14543 DB 1844-1844 / catalog 1798-1844
    disagree: 679-4-403 DB 1785-1785 / catalog 1801-1801
    disagree: 1462-1-15461 DB 1803-1803 / catalog 1803-1804
    disagree: 679-10-763 DB 1875-1893 / catalog 1884-1900
    disagree: 1462-1-6336 DB 1836-1836 / catalog 1846-1846
    disagree: 1462-1-6773 DB 1858-1858 / catalog 1848-1848
    disagree: 1530-7-10 DB 1880-1885 / catalog 1879-1885
    disagree: 1530-7-18 DB 1887-1902 / catalog 1886-1892
    disagree: 1462-1-8572 DB 1837-1837 / catalog 1838-1838
- DB files in referenced описи not in catalog: 21211 (per опис: [(('1462', '1'), 10050), (('679', '2'), 5142), (('679', '10'), 1421), (('679', '1'), 1321), (('679', '3'), 967), (('679', '14'), 495), (('679', '4'), 416), (('1530', '2'), 365), (('679', '12'), 203), (('128', '1'), 184)])
- suspicious high codes (>3× catalog max + 50): 3 e.g. [('1530-7-1788', '', ''), ('1530-7-1789', '', ''), ('679-7-125', '1821-1821', '')]
- year-ordering inversions across referenced описи: 11925
- описи that look partially loaded (catalog cites справи the DB lacks): 13 → 1530-2: DB 506 files (max 1450), catalog 798 refs (max 14020), missing 644; 679-18: DB 58 files (max 515), catalog 209 refs (max 663), missing 196; 679-15: DB 34 files (max 236), catalog 91 refs (max 253), missing 67; 679-16: DB 3 files (max 43), catalog 47 refs (max 85), missing 45; 1530-4: DB 4 files (max 114), catalog 48 refs (max 129), missing 44; 679-10: DB 3989 files (max 4014), catalog 2666 refs (max 39993), missing 23; 1462-1: DB 14967 files (max 15527), catalog 4995 refs (max 127291), missing 17; 1530-1: DB 116 files (max 1444), catalog 51 refs (max 7688), missing 16
- ACTIONS: create files 1106, create описи [], add MK tag 8819, fill years 3353, fill title 5432, fond years []
