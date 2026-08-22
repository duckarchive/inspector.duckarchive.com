# ДАТО — mbv3.pdf, printed pages 9–125 (pdf offset +0)

```
ДАТО: summary fonds 5 ['426', '484', '485', '486', '487'] | blocks 449 | справи 1324 | refs w/o ф. 3 (dropped 0) | multi-fond blocks 4 | confessions ['ІУДАЇЗМ', 'ГРЕКО-КАТОЛИЦИЗМ', "ПРАВОСЛАВ'Я", 'РИМО-КАТОЛИЦИЗМ']
   refs by fond: [('486', 444), ('487', 410), ('426', 286), ('485', 123), ('484', 61)]
   описи per fond: {'486': 1, '426': 2, '487': 1, '485': 1, '484': 1}
```

# ДАТО vs catalog — 1324 справи in 5 fonds / 6 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 117 (by опис: [('486-1', 104), ('426-2', 12), ('487-1', 1)])
- file exists: 1207 — no title 318, no «метрична книга» tag 344, no years 282, years disagree 100
    disagree: 486-1-13 DB 1896-1905 / catalog 1885-1888
    disagree: 486-1-14 DB 1896-1905 / catalog 1889-1892
    disagree: 486-1-15 DB 1896-1905 / catalog 1893-1895
    disagree: 486-1-18 DB 1896-1905 / catalog 1904-1907
    disagree: 486-1-19 DB 1900-1903 / catalog 1870-1884
    disagree: 486-1-20 DB 1904-1907 / catalog 1885-1893
    disagree: 426-1-30 DB 1888-1888 / catalog 1883-1888
    disagree: 426-1-31 DB 1891-1891 / catalog 1886-1891
    disagree: 486-1-40 DB 1882-1888 / catalog 1903-1905
    disagree: 486-1-41 DB 1889-1899 / catalog 1880-1887
    disagree: 486-1-42 DB 1880-1885 / catalog 1888-1896
    disagree: 486-1-73 DB 1889-1893 / catalog 1879-1885
- summary fond Ф. 426: DB exists; title DB='Кременецький повітовий римо-католицький деканат, м. Кременец' | catalog='Кременецький римо-католицький деканат'; years DB=1766-1907,1909-1939,1940-1943,1946-1946 | catalog=[[1766, 1946]]
- summary fond Ф. 484: DB exists; title DB='Єврейська синагога Кременецького повіту Волинської губернії' | catalog='Єврейська синагога Кременецького повіту Волинської губернії'; years DB=1870-1907 | catalog=[[1870, 1938]]
- summary fond Ф. 485: DB exists; title DB='Повітові римо-католицькі деканати Галицького намісництва' | catalog='Повітові римо-католицькі деканати Галицького намісництва'; years DB=1704-1704,1784-1944 | catalog=[[1784, 1944]]
- summary fond Ф. 486: DB exists; title DB='Парафіяльні управління православного віросповідання Кременец' | catalog='Православні парафіяльні управління Кременецького повіту'; years DB=1807-1944 | catalog=[[1838, 1942]]
- summary fond Ф. 487: DB exists; title DB='Греко-католицькі повітові управління Тернопільського краю Га' | catalog='Греко-католицькі повітові управління Тернопільського краю Га'; years DB= | catalog=[[1921, 1921]]
- DB files in referenced описи not in catalog: 336 (per опис: [(('484', '1'), 148), (('487', '1'), 73), (('426', '1'), 55), (('486', '1'), 42), (('426', '2'), 12), (('485', '1'), 6)])
- suspicious high codes (>3× catalog max + 50): 1 e.g. [('487-1-1872', '1871-1871', 'Метрична книга. Синагога, м. Кременець В')]
- year-ordering inversions across referenced описи: 1039
- описи that look partially loaded (catalog cites справи the DB lacks): 1 → 486-1: DB 376 files (max 673), catalog 444 refs (max 456), missing 104
- ACTIONS: create files 117, create описи [], add MK tag 344, fill years 282, fill title 318, fond years [('487', [[1921, 1921]])]

## Title patterns among catalog-referenced files that are not «Метрична книга. …» (451)
- 318 × `<empty>`
- 37 × `N`
- 30 × `Метрична книга євреїв м. Кременець. Народження`
- 23 × `Метрична книга євреїв м. Кременець. Смерть`
- 5 × `Метрична книга євреїв м. Кременець. Шлюб`
- 4 × `Метричні книги Православних церков`
- 4 × `Метрична книга Св. Покровської церкви с. Старий По`
- 3 × `Метрична книга римо-католицького костелу с. Лісник`
- 3 × `Death Register`
- 2 × `католики`
- 2 × `Витяги з метричних книг римо-католицьких костелів `
- 2 × `Births & Baptisms`

DB files in referenced fonds: 1545. Work dir: `work/mbv3-ДАТО/` (text, parsed json, DB snapshots, actions-ДАТО.json).
