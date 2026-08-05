#!/usr/bin/env python3
"""Per-anomaly acmb evidence: ./acmb_lookup.py <seq> [<seq>...]

For each worklist item prints the DB facts and every acmb reference for the same
(archive, fond, опис) whose year annotation overlaps the file's years, with the
surrounding catalog text so village/church can be compared, then proposes an
action:
  merge  <спр>   exactly one candidate справа and it exists in the DB inventory
  rename <спр>   exactly one candidate and that code is free in the inventory
  review         zero or several candidate справи
"""
import csv, re, sys, unicodedata
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).parent
ACMB = HERE.parent / "acmb"

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

def build_index():
    """(arch, fond, opys) -> list of (y1, y2, sprava, ctx_start_pos, volume, flat_text)"""
    idx = defaultdict(list)
    for txt in sorted(ACMB.glob("mbv*.txt")):
        flat = re.sub(r"\s+", " ", txt.read_text(encoding="utf-8", errors="replace"))
        sections = []
        for m in ARCH_RE.finditer(fold(flat)):
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
                (y1, y2, int(m.group(5)), m.start(), txt.name, flat))
    return idx

def num(x): return re.sub(r"\D", "", x)

def main():
    seqs = {int(a) for a in sys.argv[1:]}
    rows = [r for r in csv.DictReader(open(HERE / "step4-worklist.csv"))
            if int(r["seq"]) in seqs]
    idx = build_index()
    for r in rows:
        key = (r["arch"], num(r["fond"]), num(r["inv"]))
        years = [tuple(map(int, y.split(":"))) for y in r["years"].split(";") if y]
        print(f"\n=== #{r['seq']}  {r['arch']}-{r['fond']}-{r['inv']}-{r['code']}"
              f"  (p95={r['p95v']})")
        print(f"    title: {r['title'][:140]}")
        print(f"    years: {years or '—'}")
        cands = idx.get(key, [])
        # villages/towns named in the title discriminate between entries
        places = [p.strip(" ,.–-") for p in
                  re.findall(r"(?:с|м|смт|кол|х)\.\s*([А-ЯІЇЄҐ][\w’'\-]+)", r["title"])]
        hits = []
        for (y1, y2, spr, pos, vol, flat) in cands:
            if not any(not (ye < y1 or ys > y2) for ys, ye in years):
                continue
            if places:
                ctx = fold(flat[max(0, pos - 600):pos + 100])
                if not any(fold(p) in ctx for p in places):
                    continue
            hits.append((spr, y1, y2, pos, vol, flat))
        sprs = sorted({h[0] for h in hits})
        for spr, y1, y2, pos, vol, flat in hits[:6]:
            ctx = flat[max(0, pos - 160):pos + 60].strip()
            print(f"    acmb {vol} спр.{spr} ({y1}–{y2}): …{ctx[-200:]}")
        anomaly_int = int(r["ci"])
        prefix_ok = [s for s in sprs if str(anomaly_int).startswith(str(s))]
        print(f"    candidate справи: {sprs or 'none'}"
              + (f"  (prefix-consistent: {prefix_ok})" if prefix_ok else ""))
        if len(sprs) == 1:
            print(f"    → PROPOSAL: resolve to спр. {sprs[0]}")
        elif len(prefix_ok) == 1:
            print(f"    → PROPOSAL: resolve to спр. {prefix_ok[0]} (prefix match narrows {len(sprs)})")
        else:
            print(f"    → PROPOSAL: review ({len(sprs)} candidates)")

if __name__ == "__main__":
    main()
