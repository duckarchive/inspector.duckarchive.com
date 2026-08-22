# ДАЧвО — mbv3.pdf, printed pages 550–666 (pdf offset +0)

```
ДАЧвО: summary fonds 3 ['605', '987', '1245'] | blocks 297 | справи 1504 | refs w/o ф. 0 (dropped 0) | multi-fond blocks 94 | confessions ['ІУДАЇЗМ', 'ГРЕКО-КАТОЛИЦИЗМ', 'ПРАВОСЛАВ’Я', 'РИМО-КАТОЛИЦИЗМ']
   refs by fond: [('1245', 1352), ('605', 149), ('987', 3)]
   описи per fond: {'605': 1, '1245': 15, '987': 1}
```

# ДАЧвО vs catalog — 1504 справи in 3 fonds / 17 описи
- fond missing in DB: 0 → fonds []
- inventory missing in DB: 0 → описи []
- file missing in DB: 32 (by опис: [('1245-9', 18), ('1245-1', 5), ('605-1', 3), ('1245-5', 2), ('987-1', 2), ('1245-7', 1), ('1245-2', 1)])
- file exists: 1472 — no title 489, no «метрична книга» tag 624, no years 415, years disagree 326
    disagree: 605-1-11 DB 1809-1834 / catalog 1809-1835
    disagree: 605-1-19 DB 1814-1814 / catalog 1801-1873
    disagree: 605-1-27 DB 1816-1830 / catalog 1801-1873
    disagree: 605-1-28 DB 1817-1837 / catalog 1809-1835
    disagree: 605-1-30 DB 1817-1817 / catalog 1801-1933
    disagree: 605-1-31 DB 1818-1818 / catalog 1801-1873
    disagree: 605-1-36 DB 1820-1820 / catalog 1808-1843
    disagree: 605-1-38 DB 1821-1821 / catalog 1801-1933
    disagree: 605-1-47 DB 1822-1822 / catalog 1801-1933
    disagree: 605-1-52 DB 1824-1824 / catalog 1801-1873
    disagree: 605-1-54 DB 1826-1826 / catalog 1801-1933
    disagree: 605-1-55 DB 1826-1826 / catalog 1801-1873
- summary fond Ф. 605: DB exists; title DB='Кишинівська духовна консисторія у справах Хотинського повіту' | catalog='Кишинівська духовна консисторія у справах Хотинського повіту'; years DB=1784-1929 | catalog=[[1784, 1929]]
- summary fond Ф. 987: DB exists; title DB='Римо-католицька парафія м. Чернівці' | catalog='Римо-католицька парафія м. Чернівці, 1776'; years DB= | catalog=[]
- summary fond Ф. 1245: DB exists; title DB='Книги актів громадянського стану (метричні книги) нинішньої ' | catalog='Книги актів цивільного стану (метричні книги) нинішньої Черн'; years DB= | catalog=[]
- DB files in referenced описи not in catalog: 3798 (per опис: [(('1245', '13'), 478), (('1245', '1'), 472), (('1245', '2'), 334), (('1245', '11'), 311), (('1245', '9'), 302), (('1245', '3'), 294), (('1245', '6'), 267), (('1245', '7'), 232), (('1245', '8'), 208), (('1245', '12'), 194)])
- suspicious high codes (>3× catalog max + 50): 20 e.g. [('1245-1-3840', '1840-1900', 'Метрична книга. Церква Успіння Св. Богор'), ('1245-1-4649', '1784-1897', 'Метрична книга. Церква Покрови Св. Богор'), ('1245-1-5760', '1816-1933', 'Метрична книга. Церква Різдва Св. Богоро'), ('1245-1-7779', '1840-1900', 'Метрична книга. Церква Св. Параскеви, с.'), ('1245-1-8779', '1876-1911,1913-1913', 'Метрична книга. Бюро РАЦС примарії, с. Б'), ('1245-1-9395', '1876-1908', 'Метрична книга. Бюро РАЦС примарії, с. Б'), ('1245-12-1112', '1840-1914', 'Метрична книга. Церква Св. Архангелів Ми'), ('1245-12-3335', '1890-1930', 'Метрична книга. Церква Св. Архангелів Ми')]
- year-ordering inversions across referenced описи: 2889
- описи that look partially loaded (catalog cites справи the DB lacks): 1 → 605-1: DB 305 files (max 600), catalog 149 refs (max 1871), missing 3
- ACTIONS: create files 32, create описи [], add MK tag 624, fill years 415, fill title 489, fond years []

## Title patterns among catalog-referenced files that are not «Метрична книга. …» (649)
- 489 × `<empty>`
- 139 × `Church Consistory Books, Chernivtsi N-N`
- 4 × `Книга реєстрації актів про народження, шлюб та сме`
- 2 × `Church Books, Chernivtsi N-N`
- 2 × `католики`
- 2 × `Книга реєстрації актів про смерть громадян с. Садг`
- 2 × `Алфавітний покажчик актів реєстрації про шлюб гром`
- 1 × `католики N-N гг`
- 1 × `Church Consistory Books, Chernivtsi N`
- 1 × `Книга реєстрації актів про народження громадян с. `
- 1 × `Книга реєстрації актів про народження громадян м. `
- 1 × `Книга реєстрації актів про шлюб громадян м. Чернів`

DB files in referenced fonds: 5403. Work dir: `work/mbv3-ДАЧвО/` (text, parsed json, DB snapshots, actions-ДАЧвО.json).
