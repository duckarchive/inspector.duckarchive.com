import json, re, os, glob
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H)
rows = []
for line in open(f"{H}/sections.txt"):
    b, a, f, t = line.split(); md = f"{R}/{b}-{a}.md"; act = f"{R}/work/{b}-{a}/actions-{a}.json"
    if not os.path.exists(md) or not os.path.exists(act): rows.append((b, a, "FAILED")); continue
    s = open(md).read(); j = json.load(open(act))
    g = lambda pat: (re.search(pat, s) or [None, "?"])[1]
    refs = g(r"справи (\d+)"); exists = g(r"file exists: (\d+)"); miss_f = g(r"fond missing in DB: (\d+)"); miss_i = len(j["missing_inventories"]); miss = len(j["missing_files"])
    tag = len(j["add_mk_tag"]); fy = len(j["fill_years"]); ft = len(j["fill_title"]); yd = len(j["year_disagree"]); fyr = len(j["fond_years"])
    partial = g(r"partially loaded[^:]*: (\d+)"); extra = g(r"not in catalog: (\d+)"); sus = g(r"suspicious high codes[^:]*: (\d+)"); ph = g(r"not «Метрична книга\. …» \((\d+)\)")
    rows.append((b, a, refs, exists, miss_f, miss_i, miss, tag, fy, ft, fyr, yd, partial, extra, sus, ph))
L = ["# Summary — all sections", "", "| book | archive | catalog справи | in DB | fond missing | описи missing | files missing | +MK tag | +years | +title | fond years | year disagree | partial описи | DB extra | suspicious codes | placeholder titles |", "|" + "---|" * 16]
for r in rows: L.append("| " + " | ".join(map(str, r)) + " |")
open(f"{R}/SUMMARY.md", "w").write("\n".join(L) + "\n"); print("\n".join(L))
