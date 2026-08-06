#!/usr/bin/env python3
"""Classify the 669 step-4 'review' leftovers by mechanical glue pattern.

Patterns (checked in priority order, all requiring prefix B to be a plausible
справа: 1 <= B <= max(5*p95, p95+100), no leading zero):
  self-year   : suffix is a 4-digit year inside the file's own recorded range
  double      : digits are B||B (e.g. 676676)
  adjacent    : equal-length halves B||B+1 (e.g. 127128 = 127,128)
  range       : equal-length halves B||C, C > B+1, C <= 5*p95 (справи range glue)
  unique-p95  : exactly one split with B <= p95 (strict robust ceiling)
  ambiguous   : several plausible splits, no discriminator
  no-split    : no split yields a plausible справа
"""
import csv, re, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path("/Users/alexandrtovmach/Developer/duckarchive/inspector.duckarchive.com/migration/2026-08-05-code-anomaly-review")
DBURL = subprocess.run(
    ["bash", "-c", "source /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/db.sh && printf %s \"$PGURL\""],
    capture_output=True, text=True).stdout

def psql(sql):
    r = subprocess.run(["psql", DBURL, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:400])
    return r.stdout.strip()

wl = {r["seq"]: r for r in csv.DictReader(open(HERE / "step4-worklist.csv"))}
review = [r for r in csv.DictReader(open(HERE / "step4-decision-log.csv"))
          if r["action"] == "review"]

items = []
for lg in review:
    r = wl.get(lg["seq"])
    if not r:
        continue
    d = r["code"]
    if not d.isdigit():
        continue
    p95 = int(r["p95v"])
    cap = max(5 * p95, p95 + 100)
    years = [int(y) for y in re.findall(r"\d{4}", r["years"] or "")]
    ymin, ymax = (min(years), max(years)) if years else (None, None)

    splits = []           # (B, S) both as strings
    for i in range(1, len(d)):
        B, S = d[:i], d[i:]
        if B[0] == "0" or int(B) < 1:
            continue
        splits.append((B, S))
    plaus = [(B, S) for B, S in splits if int(B) <= cap]

    cls, target, note = None, None, ""
    # self-year: 4-digit suffix matching the file's own years
    sy = [(B, S) for B, S in plaus
          if len(S) == 4 and 1800 <= int(S) <= 2035 and ymin
          and ymin - 2 <= int(S) <= ymax + 2]
    if len(sy) == 1:
        cls, target = "self-year", sy[0][0]
        note = f"suffix {sy[0][1]} = own year ({r['years']})"
    elif len(d) % 2 == 0 and d[:len(d)//2] == d[len(d)//2:]:
        cls, target = "double", d[:len(d)//2]
    elif len(d) % 2 == 0 and d[len(d)//2] != "0":
        B, C = d[:len(d)//2], d[len(d)//2:]
        if int(B) <= cap and int(C) == int(B) + 1:
            cls, target = "adjacent", B
        elif int(B) <= cap and int(B) < int(C) <= cap:
            cls, target = "range", B
            note = f"{B}..{C}"
    if cls is None:
        strict = [(B, S) for B, S in plaus if int(B) <= p95]
        if len(strict) == 1:
            cls, target = "unique-p95", strict[0][0]
            note = f"page part {strict[0][1]}"
        elif len(plaus) == 0:
            cls = "no-split"
        else:
            cls = "ambiguous"
            note = "|".join(B for B, _ in plaus)
    items.append(dict(seq=r["seq"], id=r["id"], arch=r["arch"], fond=r["fond"],
                      inv=r["inv"], code=d, p95=p95, years=r["years"],
                      title=r["title"][:80], cls=cls, target=target or "", note=note,
                      why=lg["evidence"][:60]))

print(Counter(i["cls"] for i in items))

# check which targets exist in DB (same inventory), batched
cand = [i for i in items if i["target"]]
vals = ",".join(f"('{i['id']}','{i['target']}')" for i in cand)
out = psql(f"""
WITH c(aid, tgt) AS (VALUES {vals})
SELECT c.aid, c.tgt,
  count(a.id) AS alive,
  coalesce(sum((SELECT count(*) FROM files f
    WHERE f.inventory_id = a.inventory_id
      AND regexp_replace(f.code,'[^0-9].*$','') = c.tgt
      AND f.code !~ '[А-Яа-яA-Za-z]' AND f.id <> a.id)), 0) AS tgt_exists
FROM c LEFT JOIN files a ON a.id = c.aid::uuid
GROUP BY c.aid, c.tgt""")
info = {}
for line in out.splitlines():
    aid, tgt, alive, tex = line.split("|")
    info[aid] = (int(alive), int(tex))
for i in items:
    a, t = info.get(i["id"], (None, None))
    i["alive"] = a
    i["tgt_exists"] = t

w = csv.DictWriter(open(HERE / "step5-classification.csv", "w", newline=""),
                   fieldnames=list(items[0].keys()))
w.writeheader()
w.writerows(items)

c2 = Counter((i["cls"], i["tgt_exists"]) for i in items if i["target"])
for k, v in sorted(c2.items()):
    print(k, v)
