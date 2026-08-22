import json, csv, re, sys
from collections import Counter, defaultdict
S, A = sys.argv[1], sys.argv[2]
TYPO = {"ДАІФО": {"831": "631", "5941": "594"}, "ДАПО": {"101": "1011", "10111": "1011", "1001": "1011"}}.get(A, {})
pdf = json.load(open(f"{S}/{A}.json")); PR0 = pdf["refs"]; PF = pdf["fonds"]
PR = {}
for k, v in PR0.items():
    f, op, sp = k.split("-"); f = TYPO.get(f, f)
    PR.setdefault(f"{f}-{op.upper()}-{sp.upper()}", v)   # DB codes are uppercase (3А, 10А)
tsv = lambda n: list(csv.reader(open(f"{S}/{n}"), delimiter="\t", quoting=csv.QUOTE_NONE))
DF = {r[0]: r for r in tsv(f"{A}-fonds.tsv")}
DI = {(r[0], r[1]): r for r in tsv(f"{A}-inv.tsv")}
DFL = {(r[0], r[1], r[2]): r for r in tsv(f"{A}-files.tsv")}
def yrs(s):
    o = set()
    for a, b in re.findall(r"(\d{4})-(\d{4})", s or ""): o.update(range(int(a), int(b) + 1))
    return o
R = []; P = R.append
P(f"# {A} vs catalog т.4 — {len(PR)} справи in {len({k.split('-')[0] for k in PR})} fonds / {len({tuple(k.split('-')[:2]) for k in PR})} описи")
miss_f, miss_i, miss_file, bare_t, bare_tag, bare_y, ymis, ok = [], [], [], [], [], [], [], 0
for k, v in PR.items():
    f, op, sp = k.split("-")
    if f not in DF: miss_f.append(k); continue
    if (f, op) not in DI: miss_i.append(k); continue
    d = DFL.get((f, op, sp))
    if not d: miss_file.append(k); continue
    ok += 1
    if not d[3].strip(): bare_t.append(k)
    if "метрична книга" not in d[5] and any(x in v["kinds"] for x in (5, 6, 7, 8)): bare_tag.append(k)
    py, dy = set(v["years"]), yrs(d[4])
    if not dy: bare_y.append(k)
    elif py and not (min(dy) <= min(py) and max(py) <= max(dy)): ymis.append((k, f"{min(dy)}-{max(dy)}", f"{min(py)}-{max(py)}"))
P(f"- fond missing in DB: {len(miss_f)} → fonds {sorted({k.split('-')[0] for k in miss_f})}")
P(f"- inventory missing in DB: {len(miss_i)} → описи {sorted({tuple(k.split('-')[:2]) for k in miss_i})[:30]}")
P(f"- file missing in DB: {len(miss_file)} (by опис: {Counter('-'.join(k.split('-')[:2]) for k in miss_file).most_common(15)})")
P(f"- file exists: {ok} — no title {len(bare_t)}, no «метрична книга» tag {len(bare_tag)}, no years {len(bare_y)}, years disagree {len(ymis)}")
for x in ymis[:12]: P(f"    disagree: {x[0]} DB {x[1]} / catalog {x[2]}")
# summary fonds
for c, fd in PF.items():
    d = DF.get(c)
    P(f"- summary fond Ф. {c}: DB {'exists' if d else 'MISSING'}; title DB='{(d[1] if d else '')[:60]}' | catalog='{fd['title'][:60]}'; years DB={d[2] if d else ''} | catalog={fd['years']}")
# glued / extra per referenced опис
extra = defaultdict(list); glued = []
maxspr = defaultdict(int)
for k in PR:
    f, op, sp = k.split("-")
    if sp.isdigit(): maxspr[(f, op)] = max(maxspr[(f, op)], int(sp))
for (f, op, code), r in DFL.items():
    if (f, op) not in maxspr: continue
    if f"{f}-{op}-{code}" in PR: continue
    extra[(f, op)].append(code)
    if code.isdigit() and int(code) > maxspr[(f, op)] * 3 + 50: glued.append((f"{f}-{op}-{code}", r[4], r[3][:40]))
P(f"- DB files in referenced описи not in catalog: {sum(len(v) for v in extra.values())} (per опис: {sorted(((k, len(v)) for k, v in extra.items()), key=lambda x: -x[1])[:10]})")
P(f"- suspicious high codes (>3× catalog max + 50): {len(glued)} e.g. {glued[:8]}")
# inversions per опис (numeric codes, оп. 1..)
inv_cnt = 0
for (f, op) in maxspr:
    rows = sorted(((int(c), yrs(r[4])) for (ff, oo, c), r in DFL.items() if ff == f and oo == op and c.isdigit() and r[4]), key=lambda x: x[0])
    mx = None
    for c, y in rows:
        s = min(y)
        if mx is not None and s < mx - 0: inv_cnt += 1
        mx = max(mx or 0, s)
P(f"- year-ordering inversions across referenced описи: {inv_cnt}")
# ---- action lists ----
KIND = {5: "народження", 6: "шлюб", 7: "розлучення", 8: "смерть"}
def tags_for(v):
    t = [KIND[x] for x in v["kinds"] if x in KIND]; lab = " ".join(v["labels"]).lower()
    if "обшук" in lab: t.append("шлюбні обшуки")
    if "сповід" in lab: t.append("сповідальні відомості")
    return (["метрична книга"] + t) if t else []
def ranges(ys):
    ys = sorted(set(ys)); out = []
    for y in ys:
        if out and y == out[-1][1] + 1: out[-1][1] = y
        else: out.append([y, y])
    return out
actions = dict(archive=A,
    missing_files=[dict(code=k, church=PR[k]["church"], tags=tags_for(PR[k]), years=ranges(PR[k]["years"])) for k in miss_file],
    missing_inventories=sorted({"-".join(k.split("-")[:2]) for k in miss_i}),
    add_mk_tag=[dict(code=k, tags=tags_for(PR[k])) for k in bare_tag],
    fill_years=[dict(code=k, years=ranges(PR[k]["years"])) for k in bare_y if PR[k]["years"]],
    fill_title=[dict(code=k, church=PR[k]["church"]) for k in bare_t],
    year_disagree=[dict(code=k, db=a, catalog=b) for k, a, b in ymis],
    fond_years=[dict(code=c, years=fd["years"]) for c, fd in PF.items() if c in DF and not DF[c][2] and fd["years"]])
json.dump(actions, open(f"{S}/actions-{A}.json", "w"), ensure_ascii=False, indent=1)
P(f"- ACTIONS: create files {len(actions['missing_files'])}, create описи {actions['missing_inventories']}, add MK tag {len(actions['add_mk_tag'])}, fill years {len(actions['fill_years'])}, fill title {len(actions['fill_title'])}, fond years {[(x['code'], x['years']) for x in actions['fond_years']]}")
open(f"{S}/report-{A}.md", "w").write("\n".join(R) + "\n")
print("\n".join(R))
