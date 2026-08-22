# ДАЗкО vs catalog — 1301 справи in 6 fonds / 25 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 1 → описи [('Р151', '6')]
- file missing in DB: 1 (by опис: [('Р1606-7', 1)])
- file exists: 1299 — no title 0, no «метрична книга» tag 10, no years 0, years disagree 147
    disagree: Р1606-5-15 DB 1854-1894 / catalog 1827-1852
    disagree: Р1606-5-16 DB 1827-1852 / catalog 1854-1894
    disagree: Р1606-13-37 DB 1938-1949 / catalog 1932-1956
    disagree: Р1606-13-121 DB 1920-1951 / catalog 1919-1951
    disagree: Р1606-3-105 DB 1920-1945 / catalog 1920-1947
    disagree: Р1606-1-79 DB 1816-1884 / catalog 1810-1884
    disagree: Р1606-1-90 DB 1875-1892 / catalog 1875-1936
    disagree: Р1606-1-6 DB 1837-1839 / catalog 1837-1896
    disagree: Р1606-1-13 DB 1808-1839 / catalog 1808-1899
    disagree: Р1606-11-83 DB 1868-1882 / catalog 1780-1882
    disagree: Р1606-1-11 DB 1806-1839 / catalog 1806-1899
    disagree: Р1606-1-94 DB 1874-1893 / catalog 1874-1938
- DB files in referenced описи not in catalog: 206 (per опис: [(('Р1606', '1'), 50), (('Р1606', '6'), 46), (('Р1606', '15'), 26), (('Р1606', '13'), 25), (('Р1606', '7'), 14), (('Р1606', '5'), 12), (('Р1606', '4'), 11), (('Р1606', '3'), 7), (('Р1606', '8'), 7), (('Р1606', '11'), 5)])
- suspicious high codes (>3× catalog max + 50): 2 e.g. [('Р1606-13-9682', '1857-1873', 'Метрична книга. Костьол с. Велятино, Хус'), ('Р1606-3-4710', '1886-1923', 'Метрична книга. Церква с. Бобове, Виногр')]
- year-ordering inversions across referenced описи: 1271
- описи that look partially loaded (catalog cites справи the DB lacks): 0 → 
- ACTIONS: create files 1, create описи ['Р151-6'], add MK tag 10, fill years 0, fill title 0, fond years []
