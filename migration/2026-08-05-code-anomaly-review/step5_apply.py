#!/usr/bin/env python3
"""Step-5: mechanical fixes for the step-4 'review' leftovers.

Target rule (revised after finding equal-split failures in ДАХмО-315-1 and
legit series in ДАПО-Р9106-1 / ЦДАВО-1092-3):
  справа B = a proper digit-prefix of the code with B <= max(1.25*p95, p95+50);
  the remainder (glued page/аркуші count) must be 1..1500 with no leading zero.
Guards:
  - series: inventories with a run of >=4 anomalies, successive diffs <= 30,
    values < 30*p95 (dense legit numbering: filtration files etc.) -> skip all
    of that inventory's items.
  - year-only: whole code is a 4-digit year inside the file's own year range
    -> manual (code is the year, no справа recoverable).
Resolution per item:
  - self-year: unique split whose 4-digit suffix is the file's own year (+-2)
  - unique plausible split
  - several splits, adjacent tiebreak: remainder == B+1 at equal length
  - several splits: the single one whose B exists in the inventory
  else -> manual.
Apply: target exists -> merge (step-3/4 transaction + locations moved);
target free -> rename (collision-tracked; a second item hitting a target
renamed this run merges into it — multi-parish volume case).

Usage: step5_apply.py plan   (classify + DB existence -> step5-plan.csv)
       step5_apply.py run    (backup + execute + log; requires plan)
"""
import csv, json, re, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
DBURL = subprocess.run(
    ["bash", "-c", "source /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/db.sh && printf %s \"$PGURL\""],
    capture_output=True, text=True).stdout

def psql(sql):
    r = subprocess.run(["psql", DBURL, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:400])
    return r.stdout.strip()

APPLY_MERGE = """
BEGIN;
CREATE TEMP TABLE mv AS SELECT '{aid}'::uuid AS a, '{bid}'::uuid AS b;
UPDATE files t SET title = s.title, info = coalesce(t.info, s.info)
FROM mv, files s WHERE s.id=mv.a AND t.id=mv.b
  AND (t.title IS NULL OR t.title LIKE 'Церковні документи%' OR t.title LIKE 'Метричні книги%');
INSERT INTO file_years (file_id, start_year, end_year)
SELECT mv.b, y.start_year, y.end_year FROM mv JOIN file_years y ON y.file_id=mv.a
ON CONFLICT DO NOTHING;
INSERT INTO file_authors (file_id, author_id)
SELECT mv.b, fa.author_id FROM mv JOIN file_authors fa ON fa.file_id=mv.a
ON CONFLICT DO NOTHING;
INSERT INTO file_locations (lat, lng, radius_m, file_id)
SELECT fl.lat, fl.lng, fl.radius_m, mv.b FROM mv JOIN file_locations fl ON fl.file_id=mv.a
WHERE NOT EXISTS (SELECT 1 FROM file_locations e WHERE e.file_id=mv.b
  AND e.lat=fl.lat AND e.lng=fl.lng);
UPDATE online_copies oc SET file_id = mv.b, updated_at = now() FROM mv
WHERE oc.file_id = mv.a AND NOT EXISTS (
  SELECT 1 FROM online_copies o2 WHERE o2.file_id=mv.b AND o2.resource_id=oc.resource_id
    AND o2.parsed=oc.parsed AND o2.url=oc.url);
DELETE FROM file_authors fa USING mv WHERE fa.file_id=mv.a;
DELETE FROM file_locations fl USING mv WHERE fl.file_id=mv.a;
DELETE FROM files f USING mv WHERE f.id=mv.a;
COMMIT;
"""

def load_items():
    wl = {r["seq"]: r for r in csv.DictReader(open(HERE / "step4-worklist.csv"))}
    review = [r for r in csv.DictReader(open(HERE / "step4-decision-log.csv"))
              if r["action"] == "review"]
    items = []
    for lg in review:
        r = wl.get(lg["seq"])
        if r and r["code"].isdigit():
            items.append(r)
    return items

def plan():
    items = load_items()
    # series guard, per inventory
    byinv = defaultdict(list)
    for r in items:
        byinv[(r["arch"], r["fond"], r["inv"])].append(r)
    series_inv = set()
    for key, grp in byinv.items():
        p95 = int(grp[0]["p95v"])
        codes = sorted(int(g["code"]) for g in grp)
        run = 1
        for a, b in zip(codes, codes[1:]):
            run = run + 1 if (b - a <= 30 and b < 30 * p95) else 1
            if run >= 4:
                series_inv.add(key); break

    plans = []
    for r in items:
        key = (r["arch"], r["fond"], r["inv"])
        d, p95 = r["code"], int(r["p95v"])
        bound = max(int(p95 * 1.25), p95 + 50)
        years = [int(y) for y in re.findall(r"\d{4}", r["years"] or "")]
        ymin, ymax = (min(years), max(years)) if years else (None, None)
        row = dict(seq=r["seq"], id=r["id"], arch=r["arch"], fond=r["fond"],
                   inv=r["inv"], code=d, p95=p95, years=r["years"],
                   title=r["title"][:80], action="manual", target="", reason="")
        if key in series_inv:
            row["reason"] = "series-suspect inventory"; plans.append(row); continue
        if len(d) == 4 and ymin and ymin - 2 <= int(d) <= ymax + 2:
            row["reason"] = "code is the file's own year"; plans.append(row); continue

        yearish = [(d[:i], d[i:]) for i in range(1, len(d))
                   if d[0] != "0" and len(d) - i == 4
                   and 1800 <= int(d[i:]) <= 2035 and int(d[:i]) <= bound]
        sy = [(B, S) for B, S in yearish
              if ymin and ymin - 5 <= int(S) <= ymax + 5]
        if len(sy) == 1:
            row.update(action="auto", target=sy[0][0],
                       reason=f"self-year: {sy[0][0]}+{sy[0][1]} (years {r['years']})")
            plans.append(row); continue
        if yearish:
            row["reason"] = ("possible year glue but file has no years" if not ymin
                             else "year-suffix conflicts with file years")
            plans.append(row); continue

        cands = []
        for i in range(1, len(d)):
            B, S = d[:i], d[i:]
            if d[0] == "0" or S[0] == "0": continue
            if int(B) < 1 or int(B) > bound: continue
            if not (1 <= int(S) <= 1500): continue
            cands.append((B, S))
        if len(cands) == 1:
            B, S = cands[0]
            row.update(action="auto", target=B, reason=f"unique split {B}+{S}")
        else:
            adj = [(B, S) for B, S in cands
                   if len(S) == len(B) and int(S) == int(B) + 1]
            if len(adj) == 1:
                B, S = adj[0]
                row.update(action="auto", target=B, reason=f"adjacent pair {B}|{S}")
            elif cands:
                row.update(action="need-exists", target="|".join(B for B, _ in cands),
                           reason="several splits, decide by existence")
            else:
                row["reason"] = "no plausible split"
        plans.append(row)

    # DB existence for every candidate of need-exists items AND for auto targets
    pairs = []
    for p in plans:
        if p["action"] == "need-exists":
            pairs += [(p["id"], t) for t in p["target"].split("|")]
        elif p["action"] == "auto":
            pairs.append((p["id"], p["target"]))
    ex = {}
    for chunk in range(0, len(pairs), 400):
        vals = ",".join(f"('{i}','{c}')" for i, c in pairs[chunk:chunk + 400])
        out = psql(f"""
WITH c(aid, tgt) AS (VALUES {vals})
SELECT c.aid, c.tgt, count(f.id)
FROM c JOIN files a ON a.id = c.aid::uuid
LEFT JOIN files f ON f.inventory_id = a.inventory_id
  AND regexp_replace(f.code,'[^0-9].*$','') = c.tgt
  AND f.code !~ '[А-Яа-яA-Za-z]' AND f.id <> a.id
GROUP BY c.aid, c.tgt""")
        for line in out.splitlines():
            aid, tgt, n = line.split("|")
            ex[(aid, tgt)] = int(n)
    for p in plans:
        if p["action"] == "need-exists":
            hit = [t for t in p["target"].split("|") if ex.get((p["id"], t), 0) > 0]
            if len(hit) == 1:
                p.update(action="auto", target=hit[0],
                         reason=f"single existing base {hit[0]} of {p['target']}")
            else:
                p.update(action="manual", target="",
                         reason=f"splits {p['target']}: {len(hit)} exist")
        elif p["action"] == "auto":
            p["tgt_exists"] = ex.get((p["id"], p["target"]), 0)
    for p in plans:
        p.setdefault("tgt_exists", "")

    w = csv.DictWriter(open(HERE / "step5-plan.csv", "w", newline=""),
                       fieldnames=list(plans[0].keys()))
    w.writeheader(); w.writerows(plans)
    c = Counter(p["action"] for p in plans)
    m = Counter("merge" if int(p["tgt_exists"] or 0) > 0 else "rename"
                for p in plans if p["action"] == "auto")
    print(dict(c), dict(m))
    print("manual reasons:", Counter(p["reason"].split(":")[0] for p in plans
                                     if p["action"] == "manual").most_common())

def run():
    done = {r["seq"] for r in csv.DictReader(open(HERE / "step4-decision-log.csv"))
            if r["evidence"].startswith("step5") and r["action"] in
            ("renamed", "merged", "skipped")}
    plans = [p for p in csv.DictReader(open(HERE / "step5-plan.csv"))
             if p["action"] == "auto" and p["seq"] not in done]
    # backup (first run only — keeps pre-fix state; resumes must not overwrite)
    ids = ",".join(f"'{p['id']}'" for p in plans)
    if not (HERE / "step5-backup.jsonl").exists():
      with open(HERE / "step5-backup.jsonl", "w") as bk:
        for tbl, col in [("files", "id"), ("file_years", "file_id"),
                         ("file_authors", "file_id"), ("file_locations", "file_id"),
                         ("online_copies", "file_id")]:
            out = psql(f"SELECT row_to_json(t) FROM {tbl} t WHERE t.{col} IN ({ids})")
            for line in out.splitlines():
                bk.write(json.dumps({"table": tbl, "row": json.loads(line)},
                                    ensure_ascii=False) + "\n")
    log = open(HERE / "step4-decision-log.csv", "a", newline="")
    w = csv.writer(log)
    stats = Counter()
    renamed_this_run = {}   # (arch,fond,inv,target) -> renamed file id
    for p in plans:
        fc = f"{p['arch']}-{p['fond']}-{p['inv']}-{p['code']}"
        key = (p["arch"], p["fond"], p["inv"], p["target"])
        try:
            if not psql(f"SELECT 1 FROM files WHERE id='{p['id']}'"):
                stats["gone"] += 1
                w.writerow([p["seq"], fc, "skipped", "", "step5: file no longer exists"])
                continue
            bid = psql(
                "SELECT f.id FROM files f JOIN files a ON a.id='%s' AND f.inventory_id=a.inventory_id "
                "WHERE regexp_replace(f.code,'[^0-9].*$','') = '%s' AND f.code !~ '[А-Яа-яA-Za-z]' "
                "AND f.id<>a.id ORDER BY f.code LIMIT 1" % (p["id"], p["target"]))
            if not bid and key in renamed_this_run:
                bid = renamed_this_run[key]
            if bid:
                psql(APPLY_MERGE.format(aid=p["id"], bid=bid))
                stats["merged"] += 1
                w.writerow([p["seq"], fc, "merged", p["target"], "step5: " + p["reason"]])
            else:
                psql("BEGIN; UPDATE files SET code='%s', "
                     "full_code=regexp_replace(full_code,'[^-]+$','%s') WHERE id='%s'; COMMIT;"
                     % (p["target"], p["target"], p["id"]))
                renamed_this_run[key] = p["id"]
                stats["renamed"] += 1
                w.writerow([p["seq"], fc, "renamed", p["target"], "step5: " + p["reason"]])
        except Exception as e:
            stats["error"] += 1
            w.writerow([p["seq"], fc, "ERROR", "", "step5: " + str(e)[:200]])
        log.flush()
    print(dict(stats))

if __name__ == "__main__":
    {"plan": plan, "run": run}[sys.argv[1]]()
