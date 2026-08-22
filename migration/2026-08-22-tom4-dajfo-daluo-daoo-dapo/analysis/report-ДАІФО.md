# ДАІФО vs catalog т.4 — 833 справи in 3 fonds / 4 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 2 (by опис: [('631-1', 2)])
- file exists: 831 — no title 1, no «метрична книга» tag 35, no years 1, years disagree 73
    disagree: 631-1-765 DB 1882-1910 / catalog 1868-1910
    disagree: 631-1-766 DB 1879-1890 / catalog 1855-1895
    disagree: 631-1-789 DB 1921-1921 / catalog 1920-1921
    disagree: 631-1-790 DB 1923-1923 / catalog 1922-1923
    disagree: 631-1-451 DB 1859-1904 / catalog 1859-1905
    disagree: 631-1-722 DB 1906-1908 / catalog 1904-1908
    disagree: 631-1-726 DB 1874-1898 / catalog 1874-1910
    disagree: 631-1-685 DB 1865-1879 / catalog 1853-1900
    disagree: 631-1-690 DB 1866-1899 / catalog 1898-1907
    disagree: 631-1-24 DB 1864-1894 / catalog 1870-1909
    disagree: 631-1-3 DB 1874-1890 / catalog 1874-1923
    disagree: 631-1-7 DB 1835-1852 / catalog 1835-1895
- summary fond Ф. 631: DB exists; title DB='Колекція метричних книг церков, костелів, синагог Станіславс' | catalog='Колекція метричних книг церков, костелів, синагог Станіславс'; years DB=1754-1962 | catalog=[[1752, 1938]]
- DB files in referenced описи not in catalog: 76 (per опис: [(('631', '1'), 55), (('9', '1'), 18), (('631', '4'), 2), (('594', '1'), 1)])
- suspicious high codes (>3× catalog max + 50): 0 e.g. []
- year-ordering inversions across referenced описи: 817
- ACTIONS: create files 2, create описи [], add MK tag 35, fill years 1, fill title 1, fond years []
