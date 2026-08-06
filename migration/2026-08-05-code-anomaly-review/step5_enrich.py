#!/usr/bin/env python3
"""Enrich step5-classification.csv with: does the 2nd half (C) exist,
and how much data the anomaly row carries (copies/years/authors/locations)."""
import csv, subprocess
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

rows = list(csv.DictReader(open(HERE / "step5-classification.csv")))

# second half C for range/adjacent
pairs = []
for r in rows:
    d = r["code"]
    if r["cls"] in ("range", "adjacent") and len(d) % 2 == 0:
        r["chalf"] = str(int(d[len(d)//2:]))
    else:
        r["chalf"] = ""
    if r["chalf"]:
        pairs.append((r["id"], r["chalf"]))

vals = ",".join(f"('{i}','{c}')" for i, c in pairs)
out = psql(f"""
WITH c(aid, tgt) AS (VALUES {vals})
SELECT c.aid,
  coalesce(sum((SELECT count(*) FROM files f
    WHERE f.inventory_id = a.inventory_id
      AND regexp_replace(f.code,'[^0-9].*$','') = c.tgt
      AND f.code !~ '[А-Яа-яA-Za-z]' AND f.id <> a.id)), 0)
FROM c LEFT JOIN files a ON a.id = c.aid::uuid
GROUP BY c.aid""")
cex = dict(line.split("|") for line in out.splitlines())

ids = ",".join(f"'{r['id']}'" for r in rows)
out = psql(f"""
SELECT f.id,
  (SELECT count(*) FROM online_copies oc WHERE oc.file_id = f.id),
  (SELECT count(*) FROM file_years fy WHERE fy.file_id = f.id),
  (SELECT count(*) FROM file_authors fa WHERE fa.file_id = f.id),
  (SELECT count(*) FROM file_locations fl WHERE fl.file_id = f.id),
  (f.title IS NOT NULL AND f.title <> '')::int
FROM files f WHERE f.id IN ({ids})""")
data = {}
for line in out.splitlines():
    p = line.split("|")
    data[p[0]] = p[1:]

for r in rows:
    r["c_exists"] = cex.get(r["id"], "")
    d = data.get(r["id"])
    r["n_copies"], r["n_years"], r["n_authors"], r["n_locs"], r["has_title"] = d if d else ("", "", "", "", "")

w = csv.DictWriter(open(HERE / "step5-classification.csv", "w", newline=""),
                   fieldnames=list(rows[0].keys()))
w.writeheader()
w.writerows(rows)

from collections import Counter
c = Counter()
for r in rows:
    if r["cls"] in ("range", "adjacent"):
        c[(r["cls"], "B" + r["tgt_exists"], "C" + r["c_exists"])] += 1
for k, v in sorted(c.items()):
    print(k, v)
print()
cop = Counter((r["cls"], "copies>0" if r["n_copies"] not in ("", "0") else "no-copies") for r in rows)
for k, v in sorted(cop.items()):
    print(k, v)
