# ДАДнО vs catalog — 2479 справи in 4 fonds / 11 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 1 (by опис: [('193-3', 1)])
- file exists: 2478 — no title 0, no «метрична книга» tag 50, no years 1, years disagree 165
    disagree: 193-2-33 DB 1880-1881 / catalog 1880-1888
    disagree: 193-1-33 DB 1875-1877 / catalog 1875-1883
    disagree: 193-2-77 DB 1884-1889 / catalog 1883-1889
    disagree: 193-3-13 DB 1895-1896 / catalog 1895-1897
    disagree: 193-2-113 DB 1915-1918 / catalog 1901-1904
    disagree: 193-2-53 DB 1891-1893 / catalog 1891-1894
    disagree: 193-2-117 DB 1907-1909 / catalog 1907-1910
    disagree: 193-4-485 DB 1907-1908 / catalog 1907-1915
    disagree: 193-2-118 DB 1901-1904 / catalog 1900-1904
    disagree: 193-2-64 DB 1884-1884 / catalog 1884-1885
    disagree: 193-2-67 DB 1906-1910 / catalog 1893-1894
    disagree: 193-2-129 DB 1902-1902 / catalog 1901-1902
- summary fond Ф. 104: DB exists; title DB='Катеринославське духовне правління, м. Катеринослав' | catalog='Катеринославське духовне правління, м. Катеринослав'; years DB=1684-1796 | catalog=[[1768, 1784]]
- summary fond Ф. 106: DB exists; title DB='Катеринославська духовна консисторія, м. Катеринослав' | catalog='Катеринославська духовна консисторія, м. Катеринослав'; years DB=1722-1919 | catalog=[[1722, 1897], [1917, 1917], [1919, 1919]]
- summary fond Ф. 193: DB exists; title DB='Метричні книги церков Катеринославської губернії. Колекція' | catalog='Метричні книги церков Катеринославської губернії. Колекція'; years DB=1770-1934 | catalog=[[1770, 1934]]
- summary fond Ф. 282: DB exists; title DB='Синагога, м. Павлоград Катеринославської губернії' | catalog='Синагога, м. Павлоград Катеринославської губернії'; years DB=1876-1884 | catalog=[[1876, 1878], [1880, 1880], [1882, 1884]]
- DB files in referenced описи not in catalog: 361 (per опис: [(('193', '1'), 190), (('193', '3'), 71), (('193', '2'), 39), (('193', '4'), 27), (('193', '6'), 13), (('193', '5'), 9), (('193', '8'), 6), (('104', '1'), 5), (('193', '9'), 1)])
- suspicious high codes (>3× catalog max + 50): 2 e.g. [('104-1-17500', '1783-1784', 'Метрична книга. Хрестовоздвиженська церк'), ('104-1-18498', '1783-1783', 'Метрична книга. Різдвяно-Богородицька це')]
- year-ordering inversions across referenced описи: 2551
- описи that look partially loaded (catalog cites справи the DB lacks): 1 → 193-3: DB 887 files (max 887), catalog 881 refs (max 1900), missing 1
- ACTIONS: create files 1, create описи [], add MK tag 50, fill years 1, fill title 0, fond years []
