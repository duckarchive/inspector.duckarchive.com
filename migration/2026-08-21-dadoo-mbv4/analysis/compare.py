import json, csv, re, sys
from collections import defaultdict, Counter
S = sys.argv[1]
pdf = json.load(open(f"{S}/pdf.json")); PF = pdf["fonds"]; PR = pdf["refs"]
def tsv(name): return list(csv.reader(open(f"{S}/{name}"), delimiter="\t", quoting=csv.QUOTE_NONE))
DF = {r[0]: dict(code=r[0], title=r[1], info=r[2], years=r[3], inv=int(r[4]), files=int(r[5])) for r in tsv("db-fonds.tsv")}
DI = {(r[0], r[1]): dict(title=r[2], years=r[3], files=int(r[4])) for r in tsv("db-inventories.tsv")}
DFL = {}
for r in tsv("db-files.tsv"):
    DFL[(r[0], r[1], r[2])] = dict(title=r[3], years=r[4], tags=r[5], copies=int(r[6]), authors=r[7])
def yr_set(s):
    out = set()
    for a, b in re.findall(r"(\d{4})-(\d{4})", s): out.update(range(int(a), int(b) + 1))
    return out
def norm(t): return re.sub(r"[^\wа-яіїєґ]+", "", (t or "").lower().replace("’", "").replace("'", ""))
rep = []
P = rep.append

# 1. fonds
pdf_codes = set(PF); typo = {"1", "74"}
missing = sorted(pdf_codes - set(DF), key=int)
P(f"## 1. Фонди з довідника, яких немає в БД: {len(missing)}")
for c in missing: P(f"- Ф. {c} — {PF[c]['title'][:90]} ({PF[c]['books']} спр.)")
no_title = [c for c in pdf_codes & set(DF) if not DF[c]["title"].strip()]
P(f"\n## 2. Фонди в БД без назви, для яких довідник дає назву: {len(no_title)}")
for c in sorted(no_title, key=int)[:400]: P(f"- Ф. {c}: «{PF[c]['title'][:110]}»")
mism = []
for c in pdf_codes & set(DF):
    if DF[c]["title"].strip() and norm(DF[c]["title"]) != norm(PF[c]["title"]):
        mism.append(c)
P(f"\n## 3. Фонди, де назва в БД відрізняється від довідника: {len(mism)} (перші 25)")
for c in sorted(mism, key=int)[:25]: P(f"- Ф. {c}\n    БД : {DF[c]['title'][:120]}\n    PDF: {PF[c]['title'][:120]}")
fy_missing = [c for c in pdf_codes & set(DF) if not DF[c]["years"] and PF[c]["years"]]
fy_diff = [c for c in pdf_codes & set(DF) if DF[c]["years"] and PF[c]["years"] and yr_set(DF[c]["years"]) != {y for a,b in PF[c]["years"] for y in range(a,b+1)}]
P(f"\n## 4. Хронологічні межі фондів: у БД відсутні для {len(fy_missing)} фондів (довідник дає); відрізняються для {len(fy_diff)}: {fy_diff}")

# 2. books count per fond
P(f"\n## 5. Кількість справ метричних книг: довідник vs БД")
cnt_rows = []
for c in sorted(pdf_codes & set(DF), key=int):
    db_all = DF[c]["files"]
    db_mk = sum(1 for k, v in DFL.items() if k[0] == c and "метрична книга" in v["tags"])
    pdf_refs = sum(1 for k in PR if k.split("-")[0] == c)
    if PF[c]["books"] != db_mk:
        cnt_rows.append((c, PF[c]["books"], pdf_refs, db_mk, db_all))
P(f"фондів, де число «справ метричних книг» у довіднику ≠ числу файлів з тегом «метрична книга» в БД: {len(cnt_rows)} з {len(pdf_codes & set(DF))}")
P("| Ф. | довідник: справ МК | довідник: посилань спр. | БД: з тегом МК | БД: всього справ |\n|---|---|---|---|---|")
for r in cnt_rows[:60]: P("| " + " | ".join(map(str, r)) + " |")

# 3. files
P(f"\n## 6. Справи з довідника")
miss_file, miss_inv, no_years, yr_mismatch, no_title_f, not_tagged = [], [], [], [], [], []
for k, v in PR.items():
    f, op, spr = k.split("-")
    if f in typo: continue
    if (f, op) not in DI and f in DF: miss_inv.append(k)
    d = DFL.get((f, op, spr))
    if not d:
        if f in DF: miss_file.append(k)
        continue
    py = set(v["years"]); dy = yr_set(d["years"])
    if not dy: no_years.append((k, min(py), max(py)))
    elif py and (min(py) < min(dy) or max(py) > max(dy)) and not (dy and min(dy) <= min(py) and max(py) <= max(dy)):
        yr_mismatch.append((k, f"{min(dy)}-{max(dy)}", f"{min(py)}-{max(py)}"))
    if not d["title"].strip(): no_title_f.append(k)
    if "метрична книга" not in d["tags"]: not_tagged.append(k)
P(f"- посилань у довіднику (без друкарських Ф.1/Ф.74): {sum(1 for k in PR if k.split('-')[0] not in typo)}")
P(f"- описи, яких немає в БД: {sorted(set(tuple(k.split('-')[:2]) for k in miss_inv))}")
P(f"- справ, яких немає в БД (фонд є): {len(miss_file)}")
for k in miss_file[:80]: P(f"    - {k} — {PR[k]['church'][:70]}; роки {min(PR[k]['years']) if PR[k]['years'] else '?'}–{max(PR[k]['years']) if PR[k]['years'] else '?'}")
P(f"- справ у БД без років, довідник роки дає: {len(no_years)}")
for k, a, b in no_years[:80]: P(f"    - {k}: {a}–{b}")
P(f"- справ, де роки в БД не покривають роки з довідника: {len(yr_mismatch)}")
for k, a, b in yr_mismatch[:80]: P(f"    - {k}: БД {a} / довідник {b}")
P(f"- справ у БД без назви: {len(no_title_f)} (перші 30: {no_title_f[:30]})")
P(f"- справ без тега «метрична книга»: {len(not_tagged)} (перші 30: {not_tagged[:30]})")

# 4. DB files in PDF fonds not referenced in PDF
extra = defaultdict(list)
for (f, op, spr), d in DFL.items():
    if f in PF and f"{f}-{op}-{spr}" not in PR: extra[f].append(f"{op}-{spr}")
P(f"\n## 7. Справи в БД (у фондах довідника), на які довідник не посилається: {sum(len(v) for v in extra.values())} у {len(extra)} фондах")
for f in sorted(extra, key=int)[:40]: P(f"- Ф. {f}: {len(extra[f])} (напр. {', '.join(extra[f][:6])})")

# 5. DB fonds in archive that are churches but not in PDF
church_db = [c for c, d in DF.items() if c not in PF and re.search(r"церква|собор|костел|синагога|кірха|молитов", d["title"] or "", re.I)]
P(f"\n## 8. Церковні фонди в БД, яких немає в довіднику: {len(church_db)}")
for c in sorted(church_db, key=lambda x: int(re.sub(r'\D','',x) or 0))[:40]: P(f"- Ф. {c}: {DF[c]['title'][:100]} ({DF[c]['files']} спр.)")
open(f"{S}/report.md", "w").write("\n".join(rep))
print("\n".join(l for l in rep if l.startswith("## ") or l.startswith("- посилань") or l.startswith("- описи") or l.startswith("- справ") or l.startswith("фондів,")))
