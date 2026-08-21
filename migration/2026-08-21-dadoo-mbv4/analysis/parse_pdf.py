import re, json, sys
SCR, SRC = sys.argv[1], sys.argv[2]
text = open(f"{SCR}/{SRC}").read()
text = re.sub(r"(?<=[а-яіїєА-ЯІЇЄ])[aceiopxyABCEHIKMOPTXy]|[aceiopxyABCEHIKMOPTXy](?=[а-яіїєА-ЯІЇЄ])", lambda m: m.group(0).translate(str.maketrans("aceiopxyABCEHIKMOPTXy","асеіорхуАВСЕНІКМОРТХу")), text)
text = re.sub(r"\n\s*\d{1,3}\s*\n", "\n", text)
text = re.sub(r"\n(Міжархівний довідник|Державний архів Донецької області)\s*\n", "\n", text)
text = re.sub(r"(\d[–-])\s*\n\s*(?=\d)", r"\1", text)
lines = text.split("\n")

def years_from(s):
    s = re.sub(r"\b\d{2}\.\d{2}\.(1[6-9]\d\d)", r"\1", s)  # 09.01.1816–10.02.1826 -> 1816–1826
    out = []
    for m in re.finditer(r"(1[6-9]\d\d)(?:\s*[–-]\s*(1[6-9]\d\d))?", s):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        out.append((a, b))
    return out

i_sum = next(i for i, l in enumerate(lines) if l.startswith("Загальні відомості про фонди"))
i_det = next(i for i, l in enumerate(lines) if l.strip() == "ПРАВОСЛАВ’Я")
summary_txt = "\n".join(lines[i_sum:i_det])
entries = re.split(r"\n\s*(?=Ф\.\s?\d+\.)", summary_txt)[1:]
fonds = {}
YEARS = r"((?:1[6-9]\d\d(?:\s*[–-]\s*1[6-9]\d\d)?(?:,\s*)?)+)\s*рр?\."
for e in entries:
    e1 = " ".join(e.split())
    head = re.split(r"[–—-]\s*справ метричних", e1)[0]
    head = re.sub(r"\s*(Міжархівний довідник|Державний архів Донецької області)\s*", " ", head).strip()
    m = re.match(r"Ф\.\s?(\d+)\.\s*(.*)", head)
    code = m.group(1); rest = m.group(2).strip()
    ym = list(re.finditer(r",?\s*" + YEARS + r"\s*$", rest))
    if ym:
        title, hdr_years = rest[:ym[-1].start()].strip(), years_from(ym[-1].group(1))
    elif "дату не встановлено" in rest:
        title, hdr_years = rest.split(", дату не встановлено")[0].strip(), []
    else:
        print("UNPARSED HEADER:", code, repr(rest[-120:])); title, hdr_years = rest, []
    mb = re.search(r"справ метричних книг:\s*(\d+)\s*;\s*(.*?)рр?\.", e1)
    books = int(mb.group(1)) if mb else 0
    book_years = years_from(mb.group(2)) if mb else []
    if code in fonds: print("DUP FOND in summary:", code)
    fonds[code] = dict(code=code, title=title, years=hdr_years, books=books, book_years=book_years)

det_txt = "\n".join(lines[i_det:])
det_txt = det_txt[:det_txt.find("ПОКАЖЧИК НАСЕЛЕНИХ ПУНКТІВ")]
confession = None; blocks = []; cur = None
for l in det_txt.split("\n"):
    s = l.strip()
    if s in ("ПРАВОСЛАВ’Я","РИМО-КАТОЛИЦИЗМ","ЛЮТЕРАНСТВО","МЕНОНІТИ","ХРИСТИЯНИ-БАПТИСТИ","ІУДАЇЗМ"):
        confession = s; continue
    m = re.match(r"^(\d{1,2})\.\s*(.*)$", s)
    if m and 1 <= int(m.group(1)) <= 10 and (int(m.group(1)) == 1 or (cur and int(m.group(1)) == cur["last"] + 1)):
        n = int(m.group(1))
        if n == 1:
            cur = dict(conf=confession, items={}, last=0, last_fond=None); blocks.append(cur)
        cur["items"][n] = m.group(2); cur["last"] = n
    elif cur:
        cur["items"][cur["last"]] = cur["items"].get(cur["last"], "") + " " + s
refs = {}; no_fond = 0
for b in blocks:
    church = " ".join(b["items"].get(3, "").split())
    b["fonds"] = set()
    for n in (5, 6, 7, 8, 9, 10):
        t = " ".join(b["items"].get(n, "").split())
        if not t or t == "–": continue
        for seg in re.finditer(r"([^;]+?):\s*(?:ф\.\s*(\d+)[,.]\s*)?оп\.\s*(\d+[а-яА-Я]?)[,.]\s*спр\.?\s*(\d+[а-яА-Я]?)", t):
            yrs, f, op, spr = seg.groups()
            if not f:
                no_fond += 1; f = b["last_fond"]
                if not f: print("REF WITHOUT FOND:", church, seg.group(0)); continue
            b["last_fond"] = f; b["fonds"].add(f)
            r = refs.setdefault((f, op, spr), dict(years=set(), church=church, conf=b["conf"], kinds=set(), labels=set()))
            if n in (9, 10): r["labels"].add(t.split(":")[0].strip()[:80])
            for a, z in years_from(yrs): r["years"].update(range(a, z + 1))
            r["kinds"].add(n)
multi = [(b["items"].get(3,"")[:60], sorted(b["fonds"])) for b in blocks if len(b["fonds"]) > 1]
print(f"summary fonds: {len(fonds)} | blocks: {len(blocks)} | справи referenced: {len(refs)} | refs w/o 'ф.' (took block fond): {no_fond} | blocks spanning >1 fond: {len(multi)}")
for x in multi[:8]: print("   multi-fond block:", x)
print("fonds referenced in detail but absent from summary:", sorted({k[0] for k in refs} - set(fonds), key=int))
print("summary fonds never referenced in detail:", sorted(set(fonds) - {k[0] for k in refs}, key=int))
json.dump(dict(fonds=fonds, refs={"-".join(k): dict(years=sorted(v["years"]), church=v["church"], conf=v["conf"], kinds=sorted(v["kinds"]), labels=sorted(v["labels"])) for k, v in refs.items()}), open(f"{SCR}/pdf.json", "w"), ensure_ascii=False)
