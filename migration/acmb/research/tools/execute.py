"""python3 execute.py <ARCH> <slug> <placeholder_regex|-> [--apply]  — refresh research for every book of the archive,
screen (twins, year-as-code/glued refs, описи to create), write config, generate, dry-run, apply, README."""
import sys, os, re, json, csv, subprocess, datetime
from collections import Counter
ARCH, slug, rx_ph = sys.argv[1], sys.argv[2], (None if sys.argv[3] == "-" else sys.argv[3]); APPLY = "--apply" in sys.argv
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H); ROOT = os.path.dirname(os.path.dirname(R))
ENV = {**os.environ, "PGPASSWORD": "3f1fb13b-e38a-4aa3-a26c-f1a3612fc278"}
books = [l.split()[0] for l in open(f"{H}/sections.txt") if l.split()[1] == ARCH]
tom = re.sub(r"-b\d", "", books[0]).replace("mbv", "tom")
OUT = f"{ROOT}/{datetime.date.today()}-{slug}-{tom}"; os.makedirs(f"{OUT}/analysis", exist_ok=True)
def sh(cmd): return subprocess.run(cmd, capture_output=True, text=True, env=ENV)
for l in open(f"{H}/sections.txt"):
    b, a, f, t = l.split()
    if a == ARCH: print(sh(["python3", f"{H}/run.py", b, a, f, t]).stdout.strip()[:140])
def yrs(s):
    o = set()
    for a, b in re.findall(r"(\d{4})-(\d{4})", s or ""): o.update(range(int(a), int(b) + 1))
    return o
dups, excl, create_inv, notes = [], [], [], []
all_mf = Counter(); yd = Counter(); n_tags = 0
for b in books:
    W = f"{R}/work/{b}-{ARCH}"; act = json.load(open(f"{W}/actions-{ARCH}.json")); PR = json.load(open(f"{W}/{ARCH}.json"))["refs"]
    rows = {(r[0], r[1], r[2]): r for r in csv.reader(open(f"{W}/{ARCH}-files.tsv"), delimiter="\t", quoting=csv.QUOTE_NONE)}
    md = open(f"{R}/{b}-{ARCH}.md").read()
    # twins for suspicious codes
    m = re.search(r"suspicious high codes[^\[]*(\[.*?\])\n", md)
    for code, _, _ in (eval(m.group(1)) if m else []):
        f, op, c = code.split("-"); r = rows.get((f, op, c))
        if not r: continue
        tw = [kk for kk, rr in rows.items() if kk[0] == f and kk[1] == op and kk[2] != c and rr[3] == r[3] and rr[4] == r[4] and r[3] and r[4] and f"{f}-{op}-{kk[2]}" in PR]
        if len(tw) == 1 and int(r[6]) == 0: dups.append([f"{ARCH}-{code}", f"{ARCH}-" + "-".join(tw[0])])
    # year-as-code / glued refs among missing files
    dbmax = Counter()
    for (f, op, c) in rows:
        if c.isdigit(): dbmax[(f, op)] = max(dbmax[(f, op)], int(c))
    for mf in act["missing_files"]:
        f, op, c = mf["code"].split("-"); n = int(re.sub(r"\D", "", c) or 0); mx = dbmax.get((f, op), 0)
        if (1600 <= n <= 1950 and len(c) == 4 and n > mx) or (len(c) >= 5 and mx < 2000 and n > 3 * mx + 100):
            excl.append(mf["code"])
    all_mf.update(["-".join(mf["code"].split("-")[:2]) for mf in act["missing_files"] if mf["code"] not in excl])
    for inv in act["missing_inventories"]:
        n = sum(1 for k in PR if k.startswith(inv + "-"))
        (create_inv if n >= 3 else notes).append(inv if n >= 3 else f"опис {inv} skipped ({n} ref(s) — likely a typo)")
    for d in act["year_disagree"]:
        a = list(map(int, d["db"].split("-"))); c = list(map(int, d["catalog"].split("-")))
        yd["typo>60y" if c[1] - c[0] > 60 else "DB⊂catalog" if a[0] >= c[0] and a[1] <= c[1] else "catalog⊂DB" if c[0] >= a[0] and c[1] <= a[1] else "disjoint" if a[1] < c[0] or c[1] < a[0] else "shifted"] += 1
cfg = dict(archive=ARCH, books=books, out=OUT, placeholder_regex=rx_ph, exclude_codes=sorted(set(excl)), typos={}, dups=dups, apply_years_subset=True, create_inventories=sorted(set(create_inv)))
json.dump(cfg, open(f"{OUT}/config.json", "w"), ensure_ascii=False, indent=1)
gen = sh(["python3", f"{H}/generate.py", f"{OUT}/config.json"]); print(gen.stdout.strip(), gen.stderr.strip()[-300:])
def run_sql(final):
    r = sh(["psql", "-h", "localhost", "-p", "5555", "-U", "duck_dev", "-d", "inspector", "-At", "-F", " | ", "-v", "ON_ERROR_STOP=1", "-f", f"{OUT}/migration.sql", "-c", final])
    out = [l for l in (r.stdout + r.stderr).split("\n") if re.match(r"^(A created \| [1-9]|B |C |D |E |H |G |.*ERROR|COMMIT|ROLLBACK)", l)]
    return r.returncode, out
rc, out = run_sql("ROLLBACK"); print("DRY RUN:", rc, out)
applied = False
if rc == 0 and APPLY:
    rc2, out2 = run_sql("COMMIT"); applied = rc2 == 0 and "COMMIT" in out2; print("APPLY:", rc2, out2)
for b in books: sh(["cp", f"{R}/{b}-{ARCH}.md", f"{R}/work/{b}-{ARCH}/actions-{ARCH}.json", f"{OUT}/analysis/"])
counts = dict(re.findall(r"(\w+) (\d+)", gen.stdout.replace("C years", "Cyears").replace("titles", "Ctitles")))
L = [f"# {ARCH} vs «Зведений каталог метричних книг», {tom.replace('tom', 'т. ')} ({', '.join(books)})", "",
     f"Research: " + ", ".join(f"`migration/acmb/research/{b}-{ARCH}.md`" for b in books) + " (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.", "",
     f"**{'Applied' if applied else 'NOT applied'} {datetime.date.today()}** (`migration.sql`, dry-run {'OK' if rc == 0 else 'FAILED'}{', then COMMIT' if applied else ''}): " + "; ".join(out), "",
     f"- A — справи created by опис: {dict(all_mf.most_common(12))}; описи created: {cfg['create_inventories'] or '—'}.",
     f"- E — glued duplicates (identical title + span twin in the catalog set): {len(dups)} {dups[:6]}{'…' if len(dups) > 6 else ''}.",
     f"- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {dict(yd)} (the rest → editor review, `analysis/actions-{ARCH}.json` → `year_disagree`).",
     f"- G — placeholder-title family: `{rx_ph}`." if rx_ph else "- G — not applied (no placeholder family).",
     f"- Excluded refs (year printed as a справа number / glued code): {cfg['exclude_codes'][:15]}{'…' if len(cfg['exclude_codes']) > 15 else ''}." if excl else "- Excluded refs: none.",
     *([f"- {n}" for n in notes]), "", "Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`."]
open(f"{OUT}/README.md", "w").write("\n".join(L) + "\n"); print("OUT", OUT)
