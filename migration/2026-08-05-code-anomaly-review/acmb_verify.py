#!/usr/bin/env python3
"""Cross-check step3 merge pairs against the acmb OCR volumes.

For every merged pair (anomaly справа number vs base справа number) in
step3-merge-candidates.csv, look the fond+опис up in the acmb volume covering
that archive and answer:
  - confirmed     base № is listed in acmb, anomalous № is not
  - CONFLICT      the anomalous № IS a real справа per acmb -> merge suspect
  - base-missing  neither № found (acmb lists only metric-book справи, so this
                  is inconclusive, not damning)
  - no-acmb-data  fond+опис absent from the volume / archive not covered
"""
import csv, re, sys, unicodedata
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).parent
ACMB = HERE.parent / "acmb"

# oblast keyword (lowercase, prefix) -> archive code
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
REF_RE = re.compile(r"ф\.?\s*(\d+)\s*,?\s*оп\.?\s*(\d+)\s*,?\s*спр\.?\s*(\d+)(?:\s*[–—-]\s*(\d+))?", re.I)

def fold(s):
    return unicodedata.normalize("NFC", s).lower()

# (arch, fond, opys) -> set of справа ints
catalog = defaultdict(set)
per_file_counts = {}
for txt in sorted(ACMB.glob("mbv*.txt")):
    cur_arch = None
    n = 0
    text = txt.read_text(encoding="utf-8", errors="replace")
    # join hard-wrapped lines so «оп. 1,\nспр. 6776» still matches
    for chunk in text.splitlines():
        m = ARCH_RE.search(fold(chunk))
        if m:
            for k, v in OBLAST2ARCH.items():
                if m.group(1).startswith(k):
                    cur_arch = v
                    break
    # references: run over whitespace-normalised full text, tracking sections
    pos_arch = []
    for m in ARCH_RE.finditer(fold(text)):
        for k, v in OBLAST2ARCH.items():
            if m.group(1).startswith(k):
                pos_arch.append((m.start(), v))
                break
    flat = re.sub(r"\s+", " ", text)
    # map positions: rebuild on flat text
    pos_arch_flat = []
    for m in ARCH_RE.finditer(fold(flat)):
        for k, v in OBLAST2ARCH.items():
            if m.group(1).startswith(k):
                pos_arch_flat.append((m.start(), v))
                break
    for m in REF_RE.finditer(flat):
        arch = None
        for p, a in pos_arch_flat:
            if p < m.start():
                arch = a
            else:
                break
        if arch is None:
            continue
        fond, opys, s1, s2 = m.group(1), m.group(2), int(m.group(3)), m.group(4)
        catalog[(arch, fond, opys)].add(s1)
        if s2:  # range спр. N–M, capped to sane width
            s2 = int(s2)
            if s1 < s2 <= s1 + 2000:
                catalog[(arch, fond, opys)].update(range(s1, s2 + 1))
        n += 1
    per_file_counts[txt.name] = n

def code_parts(full_code):
    a, fond, opys, spr = full_code.split("-", 3)
    num = lambda x: re.sub(r"\D", "", x)
    return a, num(fond), num(opys), num(spr)

rows = []
with open(HERE / "step3-merge-candidates.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        arch, fond, opys, spr_a = code_parts(r["anomaly_code"])
        _, _, _, spr_b = code_parts(r["base_code"])
        key = (arch, fond, opys)
        known = catalog.get(key)
        if not known:
            verdict = "no-acmb-data"
        else:
            a_in = int(spr_a) in known if spr_a else False
            b_in = int(spr_b) in known if spr_b else False
            # anomaly = base + glued 4-digit year AND the same glued number occurs
            # in the acmb OCR too -> the catalog itself printed «спр. 58 1884»;
            # that CONFIRMS the concat hypothesis rather than contradicting it
            suffix = spr_a[len(spr_b):] if spr_a.startswith(spr_b) else ""
            year_glue = len(suffix) == 4 and 1750 <= int(suffix) <= 1950
            if a_in and year_glue:
                verdict = "confirmed-year-glue"
            elif a_in:
                verdict = "CONFLICT"
            elif b_in:
                verdict = "confirmed"
            else:
                verdict = "base-missing"
        rows.append({**r, "verdict": verdict,
                     "acmb_entries_for_inventory": len(known) if known else 0})

with open(HERE / "acmb-verification.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

from collections import Counter
c = Counter(r["verdict"] for r in rows)
print("refs extracted per volume:", per_file_counts, file=sys.stderr)
print(dict(c))
for r in rows:
    if r["verdict"] == "CONFLICT":
        print("CONFLICT:", r["anomaly_code"], "->", r["base_code"])
