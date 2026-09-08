import json, csv

FOND_ID   = '8775ebfa-04ab-44e3-bea9-137704f39b06'
WIKI_RES  = '12766f78-3d8b-4bfe-bbea-682267a9e3e6'
INDEX     = 'Архів:Єпархіальні Відомості'

# order = the order of the list on the index page; code = incremental
EPARCHIES = [
    # ua-adjective,        inventory title,                      edition name in file titles
    ("Волинські",        "Волинські Єпархіальні Відомості",        "Волынскія Єпархіальныя Ведомости"),
    ("Донські",          "Донські Єпархіальні Відомості",          "Донскія Єпархіальныя Ведомости"),
    ("Катеринославські", "Катеринославські Єпархіальні Відомості", "Екатеринославскія Єпархіальныя Ведомости"),
    ("Київські",         "Київські Єпархіальні Відомості",         "Кіевскія Єпархіальныя Ведомости"),
    ("Подільські",       "Подільські Єпархіальні Відомості",       "Подольскія Єпархіальныя Ведомости"),
    ("Полтавські",       "Полтавські Єпархіальні Відомості",       "Полтавскія Єпархіальныя Ведомости"),
    ("Таврійські",       "Таврійські Єпархіальні Відомості",       "Таврическія Єпархіальныя Ведомости"),
    ("Харківські",       "Харківські Єпархіальні Відомості",       "Харьковскія Єпархіальныя Ведомости"),
    ("Херсонські",       "Херсонські Єпархіальні Відомості",       "Херсонскія Єпархіальныя Ведомости"),
    ("Чернігівські",     "Чернігівські Єпархіальні Вісті",         "Черниговскія Єпархіальныя Извѣстія"),
]

rows = json.load(open("rows.json"))
by_ep = {}
for r in rows:
    by_ep.setdefault(r['eparchy'], []).append(r)

def q(s):
    return "'" + s.replace("'", "''") + "'"

def suburl(ep):
    # unencoded Cyrillic, underscores for spaces — matches existing `wiki` rows
    return "https://uk.wikisource.org/wiki/" + f"{INDEX}/{ep}".replace(" ", "_")

inv_rows, file_rows, fy_rows, ioc_rows, foc_rows = [], [], [], [], []

for idx, (ep, inv_title, edition) in enumerate(EPARCHIES, start=1):
    inv_code = str(idx)
    inv_full = f"ПЕРІОДИКА-2-{inv_code}"
    rs = sorted(by_ep[ep], key=lambda r: (r['year'], r['col']))
    years = [r['year'] for r in rs]
    inv_rows.append(dict(code=inv_code, title=f"{inv_title} ({edition})",
                         start_year=min(years), end_year=max(years)))
    ioc_rows.append(dict(inv_code=inv_code, url=suburl(ep), parsed=inv_full))
    for n, r in enumerate(rs, start=1):
        code = str(n)
        full = f"{inv_full}-{code}"
        title = f"{edition} №{r['issue']} {r['year']}"
        file_rows.append(dict(inv_code=inv_code, code=code, full_code=full,
                              title=title, year=r['year']))
        for k, u in enumerate(r['scans']):
            foc_rows.append(dict(inv_code=inv_code, file_code=code, url=u,
                                 parsed=full if k == 0 else f"{full} (додаток)"))

assert max(len(f['code']) for f in file_rows) <= 20
assert max(len(i['code']) for i in inv_rows) <= 20
print("inventories", len(inv_rows), "files", len(file_rows), "inv copies",
      len(ioc_rows), "file copies", len(foc_rows))

# ---- CSV payloads (loaded via \copy into temp tables) ----
with open("01-inventories.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["code","title","start_year","end_year"]); w.writeheader(); w.writerows(inv_rows)
with open("02-files.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["inv_code","code","full_code","title","year"]); w.writeheader(); w.writerows(file_rows)
with open("03-inventory-copies.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["inv_code","url","parsed"]); w.writeheader(); w.writerows(ioc_rows)
with open("04-file-copies.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["inv_code","file_code","url","parsed"]); w.writeheader(); w.writerows(foc_rows)

open("ids.sql","w").write(
 f"\\set fond_id {q(FOND_ID)}\n\\set wiki_res {q(WIKI_RES)}\n")
print("sample file titles:")
for s in (0, 1686, 5000, 14064): print("  ", file_rows[s]['full_code'], "|", file_rows[s]['title'])
