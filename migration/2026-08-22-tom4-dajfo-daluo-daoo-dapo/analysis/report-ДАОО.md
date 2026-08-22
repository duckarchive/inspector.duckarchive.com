# ДАОО vs catalog т.4 — 1072 справи in 6 fonds / 20 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 1 (by опис: [('39-1', 1)])
- file exists: 1071 — no title 0, no «метрична книга» tag 21, no years 0, years disagree 47
    disagree: 37-13-504 DB 1901-1901 / catalog 1900-1902
    disagree: 37-13-527 DB 1902-1902 / catalog 1902-1904
    disagree: 37-3-305 DB 1826-1826 / catalog 1826-1926
    disagree: 37-3-374 DB 1830-1830 / catalog 1830-1930
    disagree: 37-3А-259 DB 1869-1869 / catalog 1868-1869
    disagree: 37-4-203 DB 1870-1870 / catalog 1859-1870
    disagree: 37-3А-304А DB 1874-1874 / catalog 1871-1874
    disagree: 37-13-245 DB 1893-1893 / catalog 1892-1893
    disagree: 37-13-274 DB 1894-1894 / catalog 1894-1994
    disagree: 37-13-1045 DB 1916-1917 / catalog 1917-1918
    disagree: 37-3-382 DB 1831-1831 / catalog 1831-1931
    disagree: 37-3-428 DB 1834-1834 / catalog 1833-1934
- summary fond Ф. 2: DB exists; title DB='Канцелярія Одеського градоначальника' | catalog='Канцелярія одеського градоначальника'; years DB=1803-1919 | catalog=[[1802, 1917]]
- summary fond Ф. 4: DB exists; title DB='Одеська міська дума' | catalog='Одеська міська дума'; years DB= | catalog=[[1795, 1920]]
- summary fond Ф. 37: DB exists; title DB='Херсонська духовна консисторія' | catalog='Херсонська духовна консисторія'; years DB= | catalog=[[1776, 1919]]
- summary fond Ф. 39: DB exists; title DB='Одеський міський рабинат' | catalog='Одеський міський рабинат'; years DB=1846-1920 | catalog=[[1846, 1920]]
- summary fond Ф. 315: DB exists; title DB='Одеське міське з військової повинності присутствіє' | catalog='Одеське міське по військовій повинності присутствіє'; years DB= | catalog=[[1884, 1920]]
- summary fond Ф. 628: DB exists; title DB='Римо-католицькі парафіяльні церкви м. Одеси, сс. Мангейм, Се' | catalog='Правління римо-католицької церкви св. петра в м. одесі'; years DB= | catalog=[]
- summary fond Ф. 731: DB exists; title DB='Мечеть («татарська мечеть»), м. Одеса' | catalog='Мечеть міста Одеси'; years DB= | catalog=[[1849, 1917]]
- summary fond Ф. 920: DB exists; title DB='Балтський міський рабинат' | catalog='Балтський міський рабинат'; years DB=1862-1918 | catalog=[[1862, 1918]]
- summary fond Ф. 921: DB exists; title DB='Римо-католицька парафіяльна церква (костел) м. Балти Подільс' | catalog='Римо-католицька парафіяльна церква (костел) міста Балти Поді'; years DB= | catalog=[]
- summary fond Ф. 923: DB exists; title DB='Синагоги і єврейські молитовні будинки Балтського повіту Под' | catalog='Синагога єврейської колонії Абазівка Балтського повіту Поділ'; years DB=1879-1918 | catalog=[[1879, 1918]]
- DB files in referenced описи not in catalog: 2579 (per опис: [(('37', '3'), 1014), (('37', '13'), 684), (('37', '14'), 166), (('37', '3А'), 163), (('37', '4'), 148), (('39', '5'), 106), (('37', '6'), 88), (('37', '16'), 78), (('37', '12'), 42), (('37', '15'), 38)])
- suspicious high codes (>3× catalog max + 50): 4 e.g. [('37-13-8000', '1906-1906', 'Метрична книга. Святоандріївська церква '), ('37-3-13909', '', ''), ('37-6-489', '1878-1878', 'Метрична книга. Покровська церква, м. Од'), ('921-1-16517', '1918-1920', 'Метрична книга. Римо-католицька парафіял')]
- year-ordering inversions across referenced описи: 1473
- ACTIONS: create files 1, create описи [], add MK tag 21, fill years 0, fill title 0, fond years [('4', [[1795, 1920]]), ('37', [[1776, 1919]]), ('315', [[1884, 1920]]), ('731', [[1849, 1917]])]
