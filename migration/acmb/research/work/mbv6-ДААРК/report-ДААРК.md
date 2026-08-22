# ДААРК vs catalog — 6035 справи in 78 fonds / 97 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 3 → описи [('142', '25'), ('142', '51'), ('142', '6')]
- file missing in DB: 107 (by опис: [('293-1', 36), ('142-1', 16), ('321-1', 11), ('319-1', 8), ('324-1', 7), ('320-1', 7), ('299-1', 4), ('142-2', 2), ('316-1', 2), ('370-1', 2), ('669-1', 2), ('309-1', 1), ('310-1', 1), ('282-1', 1), ('305-1', 1)])
- file exists: 5925 — no title 787, no «метрична книга» tag 848, no years 25, years disagree 186
    disagree: 142-1-145 DB 1908-1908 / catalog 1883-1883
    disagree: 752-1-1 DB 1866-1866 / catalog 1860-1860
    disagree: 752-1-47 DB 1875-1877 / catalog 1872-1874
    disagree: 752-1-48 DB 1872-1874 / catalog 1875-1877
    disagree: 142-5-30 DB 1826-1826 / catalog 1826-1888
    disagree: 142-1-500 DB 1901-1901 / catalog 1901-1903
    disagree: 142-1-351 DB 1895-1895 / catalog 1894-1894
    disagree: 142-1-103 DB 1880-1880 / catalog 1852-1880
    disagree: 142-1-505 DB 1901-1901 / catalog 1901-1903
    disagree: 142-1-978 DB 1815-1815 / catalog 1815-1915
    disagree: 142-1-716 DB 1908-1908 / catalog 1907-1908
    disagree: 142-1-123 DB 1881-1881 / catalog 1855-1881
- summary fond Ф. 142: DB exists; title DB='Колекція метричних книг соборів, церков, синагог і мечетей Т' | catalog='Колекція метричних книг соборів, церков, синагог, мечетей Та'; years DB=1800-1920 | catalog=[[1791, 1920]]
- DB files in referenced описи not in catalog: 681 (per опис: [(('321', '1'), 149), (('372', '1'), 147), (('319', '1'), 59), (('142', '1'), 58), (('299', '1'), 47), (('324', '1'), 41), (('370', '1'), 38), (('259', '1'), 24), (('371', '1'), 20), (('293', '1'), 17)])
- suspicious high codes (>3× catalog max + 50): 24 e.g. [('142-4-960', '', ''), ('142-4-961', '1920-1920', ''), ('142-5-19227', '1863-1863', 'Метрична книга. Петропавлівський молитов'), ('142-5-20113', '1816-1816', 'Метрична книга. Свято-Матвіївська церква'), ('259-1-1011', '1855-1855', 'Метрична книга. Сімферопольська синагога'), ('259-1-2122', '1857-1857', 'Метрична книга. Сімферопольська синагога'), ('259-1-2325', '1857-1857', 'Метрична книга. Сімферопольська синагога'), ('259-1-2627', '1857-1857', 'Метрична книга. Сімферопольська синагога')]
- year-ordering inversions across referenced описи: 2568
- описи that look partially loaded (catalog cites справи the DB lacks): 5 → 293-1: DB 343 files (max 390), catalog 364 refs (max 390), missing 36; 142-1: DB 1078 files (max 1130), catalog 1046 refs (max 1987), missing 16; 142-3: DB 42 files (max 42), catalog 45 refs (max 992), missing 1; 305-1: DB 4 files (max 4), catalog 5 refs (max 5), missing 1; 293-2: DB 1 files (max 108), catalog 2 refs (max 109), missing 1
- ACTIONS: create files 107, create описи ['142-25', '142-51', '142-6'], add MK tag 848, fill years 25, fill title 787, fond years []
