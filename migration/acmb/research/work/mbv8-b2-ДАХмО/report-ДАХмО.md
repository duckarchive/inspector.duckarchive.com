# ДАХмО vs catalog — 3095 справи in 10 fonds / 24 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 1 → описи [('17', '6')]
- file missing in DB: 51 (by опис: [('227-1Д', 27), ('227-5Д', 16), ('17-1', 3), ('685-2', 1), ('227-9Д', 1), ('227-3Д', 1), ('227-2Д', 1), ('277-1', 1)])
- file exists: 3043 — no title 669, no «метрична книга» tag 2952, no years 2, years disagree 64
    disagree: 18-1-475 DB 1882-1887 / catalog 1882-1893
    disagree: 18-1-476 DB 1894-1900 / catalog 1894-1901
    disagree: 18-1-546 DB 1886-1889 / catalog 1886-1890
    disagree: 18-1-922 DB 1882-1889 / catalog 1882-1890
    disagree: 18-1-1581 DB 1881-1886 / catalog 1881-1889
    disagree: 18-1-1184 DB 1884-1920 / catalog 1884-1921
    disagree: Р6380-1-42 DB 1910-1918 / catalog 1910-1921
    disagree: 18-1-1592 DB 1886-1889 / catalog 1886-1891
    disagree: 18-1-1675 DB 1889-1917 / catalog 1889-1919
    disagree: 18-1-1921 DB 1910-1910 / catalog 1895-1897
    disagree: 18-1-1139 DB 1888-1897 / catalog 1906-1906
    disagree: 18-1-915 DB 1876-1890 / catalog 1876-1891
- DB files in referenced описи not in catalog: 15076 (per опис: [(('315', '1'), 12887), (('18', '1'), 1325), (('Р6379', '1'), 296), (('685', '1'), 148), (('17', '2'), 125), (('315', '2'), 63), (('17', '1'), 39), (('227', '1Д'), 33), (('Р6380', '1'), 31), (('227', '2Д'), 27)])
- suspicious high codes (>3× catalog max + 50): 57 e.g. [('17-2-218', '1778-1808', 'Метрична книга костелу м. Літин'), ('17-2-219', '1803-1817', 'Метрична книга Маньківецького костелу'), ('17-2-220', '1806-1826', 'Метрична книга Тульчинського костелу'), ('17-2-221', '1807-1826', 'Метрична книга Ободівецького костелу'), ('17-2-222', '1829-1829', 'Список прихожан Старокостянтинівського к'), ('17-2-223', '1834-1834', 'Метрична книга Гранівського костелу'), ('17-2-224', '1837-1837', 'Метрична книга костелу м. Збриж. Народже'), ('17-2-225', '1837-1837', 'Метрична книга костелу м. Куна.')]
- year-ordering inversions across referenced описи: 16161
- описи that look partially loaded (catalog cites справи the DB lacks): 3 → 227-1Д: DB 201 files (max 1144), catalog 197 refs (max 1131), missing 27; 227-5Д: DB 459 files (max 519), catalog 462 refs (max 3084), missing 16; 227-9Д: DB 0 files (max 0), catalog 1 refs (max 58), missing 1
- ACTIONS: create files 51, create описи ['17-6'], add MK tag 2952, fill years 2, fill title 669, fond years []
