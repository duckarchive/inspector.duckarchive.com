import re, json

EPARCHIES = ["Волинські","Донські","Катеринославські","Київські","Подільські",
             "Полтавські","Таврійські","Харківські","Херсонські","Чернігівські"]
cell_re = re.compile(r'^\|colspan=(\d+)\|(.*)$')
year_re = re.compile(r'^!\s.*\|\s*(\d{4})\s*$')
link_re = re.compile(r'\[\[c:File:([^|\]]+)\|([^\]]*)\]\]')

def commons(fn):
    return "https://commons.wikimedia.org/wiki/File:" + fn.replace(' ', '_')

rows=[]; anom=[]
for ep in EPARCHIES:
    txt=open(f"sub-{ep}.wikitext",encoding="utf-8").read()
    year=None; col=0
    for line in txt.splitlines():
        line=line.strip()
        m=year_re.match(line)
        if m: year=int(m.group(1)); col=0; continue
        m=cell_re.match(line)
        if not m: continue
        span=int(m.group(1)); content=m.group(2).strip(); start=col; col+=span
        if content in ('~',''): continue
        links=link_re.findall(content)
        if links:
            # first link = the issue itself; its label is the issue number
            issue=links[0][1].strip()
            scans=[commons(fn) for fn,_ in links]
        else:
            if '[[' in content: anom.append((ep,content)); continue
            issue=content; scans=[]
        rows.append(dict(eparchy=ep,year=year,issue=issue,month=min(11,start//12)+1,
                         span=span,scans=scans))
print("rows:",len(rows),"scanned:",sum(1 for r in rows if r['scans']),
      "scan-urls:",sum(len(r['scans']) for r in rows),"anom:",len(anom))
for a in anom: print(a)
json.dump(rows,open("rows.json","w"),ensure_ascii=False)

# code length / uniqueness checks
import collections
lenA=max(len(f"{r['year']}-{r['issue']}") for r in rows)
lenB=max(len(r['issue']) for r in rows)
print("max file code len  A(<рік>-<номер>):",lenA," B(<номер>):",lenB)
for tag,key in (("A",lambda r:(r['eparchy'],f"{r['year']}-{r['issue']}")),
                ("B",lambda r:(r['eparchy'],r['year'],r['issue']))):
    c=collections.Counter(key(r) for r in rows)
    print(f" {tag} dupes:",sum(v-1 for v in c.values() if v>1))
print("over-20 codes (A):",[f"{r['year']}-{r['issue']}" for r in rows if len(f"{r['year']}-{r['issue']}")>20])
print("over-20 codes (B):",[r['issue'] for r in rows if len(r['issue'])>20])
