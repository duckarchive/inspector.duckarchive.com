import json, csv, re, sys
S=sys.argv[1]
pdf=json.load(open(f"{S}/pdf.json")); PF=pdf["fonds"]; PR=pdf["refs"]
tsv=lambda n: list(csv.reader(open(f"{S}/{n}"), delimiter="\t", quoting=csv.QUOTE_NONE))
DFL={(r[0],r[1],r[2]):r for r in tsv("db-files.tsv")}
def yrs(s):
    o=set()
    for a,b in re.findall(r"(\d{4})-(\d{4})",s): o.update(range(int(a),int(b)+1))
    return o
rows=[]
for (f,op,code),r in DFL.items():
    if f not in PF or f"{f}-{op}-{code}" in PR: continue
    if not (op!="1" or len(code)>3): continue
    dby=yrs(r[4]); cands=[]
    # inventory glue: op = "1"+page
    op2 = "1" if op!="1" and op.startswith("1") else op
    if op!="1":
        key=f"{f}-1-{code}"
        if key in PR:
            py=set(PR[key]["years"]); cands.append((key,"",("years-match" if (dby==py or dby<=py or py<=dby) else "years-diff") if dby and py else "no-years", f"{min(py)}-{max(py)}" if py else "", "EXISTS in DB" if (f,"1",code) in DFL else "free"))
    for n in range(1,len(code)):
        p,rest=code[:n],code[n:]
        key=f"{f}-{op2}-{p}"
        if key in PR:
            py=set(PR[key]["years"]); exists=(f,op2,p) in DFL
            score=("years-match" if dby and py and (dby==py or dby<=py or py<=dby) else "years-diff" if dby and py else "no-years")
            cands.append((key,rest,score,f"{min(py)}-{max(py)}" if py else "", "EXISTS in DB" if exists else "free"))
    if op!="1" and not cands and f"{f}-1-{code}" in PR:
        py=set(PR[f"{f}-1-{code}"]["years"]); cands.append((f"{f}-1-{code}","",("years-match" if dby==py or dby<=py else "years-diff") if dby and py else "no-years", f"{min(py)}-{max(py)}" if py else "", "EXISTS in DB" if (f,"1",code) in DFL else "free"))
    rows.append((f"{f}-{op}-{code}", r[4], r[3][:45], cands))
for k,y,t,c in rows:
    print(f"{k:18} years={y or '-':20} | {t}")
    for cc in c:
        print(f"      -> {cc[0]:12} tail={cc[1]:10} {cc[2]:12} pdf={cc[3]:10} {cc[4]}")
        tf,top,tc=cc[0].split("-")
        if (tf,top,tc) in DFL:
            tr=DFL[(tf,top,tc)]; print(f"         target row: title='{tr[3][:40]}' years={tr[4] or '-'} tags={tr[5][:30] or '-'} copies={tr[6]}")
