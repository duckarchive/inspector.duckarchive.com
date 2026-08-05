#!/usr/bin/env python3
"""Step-4 engine: per-item acmb reconciliation of code anomalies.

Processes step4-worklist.csv sequentially. For each item:
  candidates = acmb refs for (arch, fond, опис) filtered by year overlap and,
  when the title names places, by place mention near the ref; the item's own
  glued number is dropped from candidates when it exceeds the inventory p95×5
  (acmb OCR echoes the same glue).
Resolve when exactly one candidate survives, or exactly one is a string-prefix
of the anomalous number. Apply:
  - target exists in DB  -> merge (years/authors/copies moved, title onto
                            NULL/generic base), one transaction per item
  - target free          -> rename the file's code in place
Everything else -> review, untouched. Every item appended to
step4-decision-log.csv. Usage: step4_engine.py <from_seq> <to_seq>
"""
import csv, re, subprocess, sys, unicodedata
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).parent
ACMB = HERE.parent / "acmb"
DBURL = subprocess.run(
    ["bash", "-c", "source /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/db.sh && printf %s \"$PGURL\""],
    capture_output=True, text=True).stdout

OBLAST2ARCH = {
    "волинськ": "ДАВоО", "дніпропетровськ": "ДАДнО", "закарпатськ": "ДАЗкО",
    "тернопільськ": "ДАТО", "черкаськ": "ДАЧкО", "чернівецьк": "ДАЧвО",
    "донецьк": "ДАДоО", "івано-франківськ": "ДАІФО", "луганськ": "ДАЛуО",
    "одеськ": "ДАОО", "полтавськ": "ДАПО", "харківськ": "ДАХО",
    "запорізьк": "ДАЗпО", "херсонськ": "ДАХеО", "вінницьк": "ДАВіО",
    "кіровоградськ": "ДАКрО", "хмельницьк": "ДАХмО", "житомирськ": "ДАЖО",
    "чернігівськ": "ДАЧгО",
}
ARCH_RE = re.compile(r"державн\w*\s+архів\w*\s+([\w’'\-]+?ої)\s+област", re.I)
REF_RE = re.compile(
    r"(\d{4})(?:\s*[–—-]\s*(\d{4}))?\s*:\s*ф\.?\s*(\d+)\s*,\s*оп\.?\s*(\d+)\s*,\s*спр\.?\s*(\d+)",
    re.I)

def fold(s): return unicodedata.normalize("NFC", s).lower()
def num(x): return re.sub(r"\D", "", x)

def psql(sql):
    r = subprocess.run(["psql", DBURL, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:400])
    return r.stdout.strip()

def build_index():
    idx = defaultdict(list)
    for txt in sorted(ACMB.glob("mbv*.txt")):
        flat = re.sub(r"\s+", " ", txt.read_text(encoding="utf-8", errors="replace"))
        f = fold(flat)
        sections = []
        for m in ARCH_RE.finditer(f):
            for k, v in OBLAST2ARCH.items():
                if m.group(1).startswith(k):
                    sections.append((m.start(), v)); break
        for m in REF_RE.finditer(flat):
            arch = None
            for p, a in sections:
                if p < m.start(): arch = a
                else: break
            if arch is None: continue
            y1 = int(m.group(1)); y2 = int(m.group(2) or m.group(1))
            idx[(arch, m.group(3), m.group(4))].append(
                (y1, y2, int(m.group(5)), f[max(0, m.start()-600):m.start()+100]))
    return idx

def decide(r, idx):
    key = (r["arch"], num(r["fond"]), num(r["inv"]))
    years = [tuple(map(int, y.split(":"))) for y in r["years"].split(";") if y]
    if not years or key not in idx:
        return None, "review", "no acmb data or no years"
    places = [p.strip(" ,.–-") for p in
              re.findall(r"(?:с|м|смт|кол|х)\.\s*([А-ЯІЇЄҐ][\w’'\-]+)", r["title"])]
    ci = int(r["ci"]); p95 = float(r["p95v"])
    hits = []
    for (y1, y2, spr, ctx) in idx[key]:
        if not any(not (ye < y1 or ys > y2) for ys, ye in years):
            continue
        if places and not any(fold(p) in ctx for p in places):
            continue
        hits.append((spr, y1, y2))
    # drop the anomaly's own glue echo
    sprs = sorted({s for s, _, _ in hits if not (s == ci and s > 5 * p95)})
    if not sprs:
        return None, "review", "no candidates after filters"
    exact = sorted({s for s, y1, y2 in hits for ys, ye in years if (y1, y2) == (ys, ye) and s != ci})
    pref = [s for s in sprs if str(ci).startswith(str(s))]
    if len(sprs) == 1:
        return sprs[0], "resolve", f"single candidate; years {years}"
    if len(exact) == 1 and exact[0] in pref:
        return exact[0], "resolve", f"exact year match + prefix, of {len(sprs)}"
    if len(pref) == 1 and len(sprs) <= 12 and places:
        return pref[0], "resolve", f"unique prefix among {len(sprs)} place-filtered"
    return None, "review", f"{len(sprs)} candidates, prefix={pref[:4]}"

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
UPDATE online_copies oc SET file_id = mv.b, updated_at = now() FROM mv
WHERE oc.file_id = mv.a AND NOT EXISTS (
  SELECT 1 FROM online_copies o2 WHERE o2.file_id=mv.b AND o2.resource_id=oc.resource_id
    AND o2.parsed=oc.parsed AND o2.url=oc.url);
DELETE FROM file_authors fa USING mv WHERE fa.file_id=mv.a;
DELETE FROM file_locations fl USING mv WHERE fl.file_id=mv.a;
DELETE FROM files f USING mv WHERE f.id=mv.a;
COMMIT;
"""

def main():
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    idx = build_index()
    rows = [r for r in csv.DictReader(open(HERE / "step4-worklist.csv"))
            if lo <= int(r["seq"]) <= hi]
    log = open(HERE / "step4-decision-log.csv", "a", newline="")
    w = csv.writer(log)
    stats = defaultdict(int)
    for r in rows:
        seq = r["seq"]
        anomaly_fc = f"{r['arch']}-{r['fond']}-{r['inv']}-{r['code']}"
        try:
            target, action, why = decide(r, idx)
            if action != "resolve":
                stats["review"] += 1
                w.writerow([seq, anomaly_fc, "review", "", why]); continue
            # current state check: anomaly still there? target exists?
            aid = psql(f"SELECT id FROM files WHERE id='{r['id']}'")
            if not aid:
                stats["gone"] += 1
                w.writerow([seq, anomaly_fc, "skipped", "", "file no longer exists"]); continue
            bid = psql(
                "SELECT f.id FROM files f JOIN files a ON a.id='%s' AND f.inventory_id=a.inventory_id "
                "WHERE regexp_replace(f.code,'[^0-9].*$','') = '%s' AND f.code !~ '[А-Яа-яA-Za-z]' AND f.id<>a.id LIMIT 1"
                % (r["id"], target))
            if bid:
                psql(APPLY_MERGE.format(aid=r["id"], bid=bid))
                stats["merged"] += 1
                w.writerow([seq, anomaly_fc, "merged", target, why])
            else:
                psql("BEGIN; UPDATE files SET code='%s', "
                     "full_code=regexp_replace(full_code,'[^-]+$','%s') WHERE id='%s'; COMMIT;"
                     % (target, target, r["id"]))
                stats["renamed"] += 1
                w.writerow([seq, anomaly_fc, "renamed", target, why])
        except Exception as e:
            stats["error"] += 1
            w.writerow([seq, anomaly_fc, "ERROR", "", str(e)[:200]])
        log.flush()
    print(dict(stats))

if __name__ == "__main__":
    main()
