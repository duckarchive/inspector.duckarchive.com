"""research driver: python3 run.py <book> <ARCHIVE> <printed_from> <printed_to>  → work/<book>-<ARCH>/ + research/<book>-<ARCH>.md"""
import sys, os, re, subprocess, json, csv
from collections import Counter
book, A, p_from, p_to = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(H); PDF = f"{os.path.dirname(ROOT)}/{book}.pdf"
W = f"{ROOT}/work/{book}-{A}"; os.makedirs(W, exist_ok=True)
ENV = {**os.environ, "PGPASSWORD": "3f1fb13b-e38a-4aa3-a26c-f1a3612fc278"}
def sh(cmd): return subprocess.run(cmd, capture_output=True, text=True, env=ENV).stdout
def psql(sql, out=None):
    r = subprocess.run(["psql", "-h", "localhost", "-p", "5555", "-U", "duck_dev", "-d", "inspector", "-At", "-F", "\t", "-c", sql], capture_output=True, text=True, env=ENV)
    if r.returncode: raise SystemExit(r.stderr)
    if out: open(out, "w").write(r.stdout)
    return r.stdout
# --- printed page → pdf page offset: find the pdf page whose text ends/starts with the bare printed number
def page_text(n): return sh(["pdftotext", "-f", str(n), "-l", str(n), "-enc", "UTF-8", PDF, "-"])
offset = None
for probe in (p_from + 2, p_from + 5):
    for off in range(-8, 16):
        t = page_text(probe + off)
        if re.search(rf"(^|\n)\s*{probe}\s*(\n|$)", t): offset = off; break
    if offset is not None: break
if offset is None: offset = 0
sh(["pdftotext", "-f", str(p_from + offset), "-l", str(p_to + offset), "-enc", "UTF-8", PDF, f"{W}/text.txt"])
# --- parse
parse = sh(["python3", f"{H}/parse_v4.py", f"{W}/text.txt", f"{W}/{A}.json", A])
refs = json.load(open(f"{W}/{A}.json"))["refs"]
fonds_ref = sorted({k.split("-")[0] for k in refs})
# --- DB dumps (fonds, inventories, files of referenced fonds)
psql(f"select f.code, regexp_replace(coalesce(f.title,''), E'[\\n\\r\\t]+', ' ', 'g'), (select string_agg(start_year||'-'||end_year, ',' order by start_year) from fond_years y where y.fond_id=f.id), (select count(*) from inventories i where i.fond_id=f.id), (select count(*) from files fl join inventories i on i.id=fl.inventory_id where i.fond_id=f.id) from fonds f join archives ar on ar.id=f.archive_id where ar.code='{A}'", f"{W}/{A}-fonds.tsv")
psql(f"select f.code, i.code, regexp_replace(coalesce(i.title,''), E'[\\n\\r\\t]+', ' ', 'g'), (select count(*) from files fl where fl.inventory_id=i.id) from inventories i join fonds f on f.id=i.fond_id join archives ar on ar.id=f.archive_id where ar.code='{A}'", f"{W}/{A}-inv.tsv")
fl = ",".join("'%s'" % f.replace("'", "''") for f in fonds_ref) or "''"
psql(f"select f.code, i.code, fl.code, regexp_replace(coalesce(fl.title,''), E'[\\n\\r\\t]+', ' ', 'g'), (select string_agg(start_year||'-'||end_year, ',' order by start_year) from file_years y where y.file_id=fl.id), array_to_string(fl.tags,'|'), (select count(*) from online_copies oc where oc.file_id=fl.id), fl.full_code from files fl join inventories i on i.id=fl.inventory_id join fonds f on f.id=i.fond_id join archives ar on ar.id=f.archive_id where ar.code='{A}' and f.code in ({fl}) order by 1,2,3", f"{W}/{A}-files.tsv")
# --- compare
cmp = sh(["python3", f"{H}/compare_v4.py", W, A])
act = json.load(open(f"{W}/actions-{A}.json"))
nfiles = sum(1 for _ in open(f"{W}/{A}-files.tsv"))
# placeholder-title count among referenced files
rows = {(r[0], r[1], r[2]): r for r in csv.reader(open(f"{W}/{A}-files.tsv"), delimiter="\t", quoting=csv.QUOTE_NONE)}
titles = Counter()
for k in refs:
    f, op, sp = k.split("-"); r = rows.get((f, op.upper(), sp.upper()))
    if r and not re.match(r"^(Метрична книга\.|Книга шлюбних|Сповідальні)", r[3] or ""): titles[re.sub(r"\d+", "N", r[3] or "<empty>")[:50]] += 1
md = [f"# {A} — {book}.pdf, printed pages {p_from}–{p_to} (pdf offset {offset:+d})", "", "```", parse.strip(), "```", "", cmp.strip(), "",
      f"## Title patterns among catalog-referenced files that are not «Метрична книга. …» ({sum(titles.values())})", *[f"- {n} × `{t}`" for t, n in titles.most_common(12)], "",
      f"DB files in referenced fonds: {nfiles}. Work dir: `work/{book}-{A}/` (text, parsed json, DB snapshots, actions-{A}.json)."]
open(f"{ROOT}/{book}-{A}.md", "w").write("\n".join(md) + "\n")
print(f"{book} {A}: offset {offset:+d}, {len(refs)} справи, fonds {fonds_ref[:8]}{'…' if len(fonds_ref) > 8 else ''}; " + cmp.strip().split("\n")[-1][:160])
