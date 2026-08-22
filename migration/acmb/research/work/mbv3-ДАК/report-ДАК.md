# ДАК vs catalog — 160 справи in 6 fonds / 7 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 21 (by опис: [('237-1', 19), ('312-1', 2)])
- file exists: 139 — no title 0, no «метрична книга» tag 7, no years 0, years disagree 16
    disagree: 237-1-100 DB 1858-1860 / catalog 1858-1899
    disagree: 237-1-67 DB 1862-1864 / catalog 1862-1899
    disagree: 237-1-58 DB 1867-1889 / catalog 1867-1899
    disagree: 237-1-63 DB 1860-1889 / catalog 1860-1899
    disagree: 237-1-72 DB 1895-1896 / catalog 1867-1899
    disagree: 237-1-85 DB 1894-1901 / catalog 1867-1901
    disagree: 237-1-62 DB 1880-1884 / catalog 1878-1905
    disagree: 237-1-57 DB 1878-1905 / catalog 1876-1905
    disagree: 312-1-78 DB 1857-1857 / catalog 1849-1857
    disagree: 312-1-36 DB 1835-1835 / catalog 1835-1837
    disagree: 312-1-41 DB 1836-1836 / catalog 1835-1837
    disagree: 312-1-35 DB 1835-1835 / catalog 1835-1837
- summary fond Ф. 3: DB exists; title DB='Києво-Софійський кафедральний собор' | catalog='Києво-Софійський кафедральний собор, м. Київ'; years DB= | catalog=[[1748, 1897]]
- summary fond Ф. 6: DB exists; title DB='Київський Військово-Миколаївський собор' | catalog='Київський військово-Миколаївський собор, м. Київ'; years DB= | catalog=[[1811, 1922]]
- summary fond Ф. 8: DB exists; title DB='Києво-Подільська Покровська церква' | catalog='Києво-Подільська Покровська церква, м. Київ'; years DB= | catalog=[[1802, 1915]]
- summary fond Ф. 11: DB exists; title DB='Києво-Подільська Воскресенська церква' | catalog='Києво-Подільська Воскресенська церква, м. Київ'; years DB= | catalog=[[1802, 1920]]
- summary fond Ф. 12: DB exists; title DB='Київська Десятинна церква' | catalog='Київська Десятинна церква, м. Київ'; years DB= | catalog=[[1839, 1919]]
- summary fond Ф. 237: DB exists; title DB='Київська міська поліція' | catalog='Київська міська поліція, м. Київ'; years DB= | catalog=[[1803, 1917]]
- summary fond Ф. 312: DB exists; title DB='Києво-Васильківський римо-католицький деканат' | catalog='Києво-Васильківський римо-католицький деканат.'; years DB=1782-1915 | catalog=[]
- DB files in referenced описи not in catalog: 10 (per опис: [(('312', '1'), 7), (('6', '1'), 2), (('237', '1'), 1)])
- suspicious high codes (>3× catalog max + 50): 0 e.g. []
- year-ordering inversions across referenced описи: 41
- описи that look partially loaded (catalog cites справи the DB lacks): 1 → 237-1: DB 17 files (max 105), catalog 35 refs (max 110), missing 19
- ACTIONS: create files 21, create описи [], add MK tag 7, fill years 0, fill title 0, fond years [('3', [[1748, 1897]]), ('6', [[1811, 1922]]), ('8', [[1802, 1915]]), ('11', [[1802, 1920]]), ('12', [[1839, 1919]]), ('237', [[1803, 1917]])]
