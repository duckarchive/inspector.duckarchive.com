# ДАЖО vs catalog — 4291 справи in 41 fonds / 62 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 8 → описи [('1', '768'), ('420', '74')]
- file missing in DB: 183 (by опис: [('1-75', 85), ('1-91', 20), ('1-74', 7), ('1-78', 7), ('1-7', 5), ('1-77', 4), ('643-1', 4), ('594-1', 3), ('1-87', 3), ('644-1', 3), ('672-1', 3), ('670-1', 3), ('678-1', 3), ('677-1', 3), ('657-1', 3)])
- file exists: 4100 — no title 68, no «метрична книга» tag 1319, no years 42, years disagree 2195
    disagree: 1-77-1493 DB 1910-1916 / catalog 1873-1915
    disagree: 1-77-1505 DB 1916-1916 / catalog 1873-1915
    disagree: 1-77-1516 DB 1912-1916 / catalog 1873-1915
    disagree: 1-77-1529 DB 1916-1916 / catalog 1873-1915
    disagree: 1-77-1541 DB 1916-1916 / catalog 1873-1915
    disagree: 1-74-227 DB 1796-1796 / catalog 1795-1796
    disagree: 1-75-3 DB 1798-1879 / catalog 1798-1887
    disagree: 1-74-235 DB 1806-1810 / catalog 1805-1810
    disagree: 1-74-240 DB 1810-1815 / catalog 1808-1815
    disagree: 1-75-22 DB 1811-1811 / catalog 1804-1887
    disagree: 1-75-23 DB 1812-1812 / catalog 1804-1814
    disagree: 1-75-25 DB 1813-1813 / catalog 1804-1814
- DB files in referenced описи not in catalog: 5476 (per опис: [(('178', '51'), 1358), (('1', '78'), 879), (('1', '44'), 700), (('1', '77'), 681), (('1', '76'), 492), (('178', '3'), 341), (('1', '74'), 254), (('1', '91'), 226), (('1', '81'), 118), (('67', '8'), 60)])
- suspicious high codes (>3× catalog max + 50): 527 e.g. [('1-44-210', '', 'Про видачу Софії та Любові Шиманським св'), ('1-44-211', '', 'Про переміщення псаломщ. дияконів с. Заг'), ('1-44-212', '', 'Про переміщення псаломщ. с. Вовчиці Поль'), ('1-44-213', '', 'Про відрядження в Новодубенско... свящ. '), ('1-44-214', '1914-1914', 'Про виключення з духовного звання псалом'), ('1-44-215', '', 'Про відсторонення від парафії свящ. Шлях'), ('1-44-216', '', 'Про влаштування в м. ... Остр. пов., пив'), ('1-44-217', '', 'Про переміщення до Єнісейської єпархії п')]
- year-ordering inversions across referenced описи: 6491
- описи that look partially loaded (catalog cites справи the DB lacks): 32 → 1-75: DB 312 files (max 192194), catalog 344 refs (max 2639), missing 85; 1-91: DB 299 files (max 307), catalog 95 refs (max 2160), missing 20; 1-74: DB 411 files (max 411), catalog 169 refs (max 3338), missing 7; 1-78: DB 1171 files (max 11149), catalog 301 refs (max 11699), missing 7; 1-7: DB 0 files (max 0), catalog 5 refs (max 1888), missing 5; 1-77: DB 2249 files (max 2973), catalog 1608 refs (max 16634), missing 4; 643-1: DB 0 files (max 0), catalog 4 refs (max 4), missing 4; 594-1: DB 0 files (max 0), catalog 3 refs (max 1829), missing 3
- ACTIONS: create files 183, create описи ['1-768', '420-74'], add MK tag 1319, fill years 42, fill title 68, fond years []
