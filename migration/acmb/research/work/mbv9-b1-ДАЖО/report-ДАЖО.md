# ДАЖО vs catalog — 2171 справи in 7 fonds / 22 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 245 (by опис: [('1-76', 194), ('1-7', 18), ('1-74', 6), ('1-87', 6), ('590-1', 5), ('1-78', 4), ('579-1', 3), ('581-1', 2), ('1-1', 2), ('584-1', 1), ('1-84', 1), ('582-1', 1), ('1-77', 1), ('1-91', 1)])
- file exists: 1926 — no title 0, no «метрична книга» tag 1700, no years 97, years disagree 1686
    disagree: 1-78-531 DB 1802-1802 / catalog 1797-1807
    disagree: 1-78-539 DB 1807-1807 / catalog 1803-1812
    disagree: 1-78-541 DB 1808-1808 / catalog 1804-1812
    disagree: 1-78-544 DB 1809-1809 / catalog 1806-1813
    disagree: 1-78-545 DB 1810-1810 / catalog 1806-1814
    disagree: 1-78-548 DB 1811-1811 / catalog 1807-1815
    disagree: 1-78-552 DB 1813-1813 / catalog 1809-1817
    disagree: 1-78-554 DB 1814-1814 / catalog 1810-1821
    disagree: 1-78-555 DB 1815-1815 / catalog 1811-1821
    disagree: 1-78-558 DB 1816-1816 / catalog 1812-1820
    disagree: 1-78-559 DB 1817-1817 / catalog 1812-1822
    disagree: 1-78-561 DB 1818-1818 / catalog 1814-1822
- DB files in referenced описи not in catalog: 3744 (per опис: [(('1', '77'), 1570), (('1', '78'), 701), (('1', '76'), 326), (('1', '75'), 295), (('1', '91'), 280), (('1', '74'), 248), (('1', '81'), 107), (('1', '84'), 57), (('1', '1'), 44), (('1', '86'), 42)])
- suspicious high codes (>3× catalog max + 50): 38 e.g. [('1-1-135', '1795-1795', 'О кликушах притворнующих и о проч.'), ('1-1-145', '1796-1796', 'По прошению священнического сына Федора '), ('1-1-146', '1796-1796', 'Про приєднання в Дубнівському повіті нар'), ('1-1-160', '1799-1799', 'По рапорту Овручского духовного правлени'), ('1-1-181', '1795-1795', 'Про біглого єромонаха Острозького Преобр'), ('1-1-183', '1798-1798', 'Об отпуске священников Слошинского и Нов'), ('1-1-186', '1796-1796', 'Про біглого ієромонаха Острозького Преоб'), ('1-1-198', '1795-1795', 'О дозволении священническому сыну Иоаким')]
- year-ordering inversions across referenced описи: 3500
- описи that look partially loaded (catalog cites справи the DB lacks): 10 → 1-76: DB 573 files (max 986), catalog 442 refs (max 2151), missing 194; 1-7: DB 0 files (max 0), catalog 18 refs (max 846), missing 18; 1-74: DB 411 files (max 411), catalog 174 refs (max 668), missing 6; 590-1: DB 0 files (max 0), catalog 5 refs (max 1820), missing 5; 579-1: DB 0 files (max 0), catalog 3 refs (max 4), missing 3; 581-1: DB 0 files (max 0), catalog 2 refs (max 2), missing 2; 1-84: DB 80 files (max 80), catalog 24 refs (max 1810), missing 1; 584-1: DB 0 files (max 0), catalog 1 refs (max 1), missing 1
- ACTIONS: create files 245, create описи [], add MK tag 1700, fill years 97, fill title 0, fond years []
