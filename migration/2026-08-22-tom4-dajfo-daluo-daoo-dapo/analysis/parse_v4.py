"""Generic parser for a «Зведений каталог метричних книг» т.4 archive section (pdftotext output)."""
import re, json, sys
SRC, OUT, ARCH = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(SRC).read()
text = re.sub(r"(?<=[а-яіїєА-ЯІЇЄ])[aceiopxyABCEHIKMOPTXy]|[aceiopxyABCEHIKMOPTXy](?=[а-яіїєА-ЯІЇЄ])", lambda m: m.group(0).translate(str.maketrans("aceiopxyABCEHIKMOPTXy","асеіорхуАВСЕНІКМОРТХу")), text)
text = re.sub(r"\n\s*\d{1,3}\s*\n", "\n", text)                         # page numbers
text = re.sub(r"\n(Міжархівний довідник|Державний архів [^\n]{5,60}області)\s*\n", "\n", text)  # running heads
text = re.sub(r"(\d[–-])\s*\n\s*(?=\d)", r"\1", text)                    # 1854–\n1856
lines = text.split("\n")
HEADINGS = {"ПРАВОСЛАВ’Я","РИМО-КАТОЛИЦИЗМ","ГРЕКО-КАТОЛИЦИЗМ","ЛЮТЕРАНСТВО","ГРИГОРІАНСТВО","МЕНОНІТИ","ХРИСТИЯНИ-БАПТИСТИ","ІУДАЇЗМ","ІСЛАМ","ПРОТЕСТАНТИЗМ","СТАРООБРЯДЦІ","КАРАЇМИ","ЄВАНГЕЛЬСЬКІ ХРИСТИЯНИ"}
def years_from(s):
    s = re.sub(r"\b\d{2}\.\d{2}\.(1[6-9]\d\d)", r"\1", s)
    out = []
    for m in re.finditer(r"(1[6-9]\d\d)(?:\s*[–-]\s*(1[6-9]\d\d))?", s):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        out.append((a, b))
    return out
i_sum = next((i for i, l in enumerate(lines) if l.startswith("Загальні відомості про фонд")), 0)
i_det = next(i for i, l in enumerate(lines) if l.strip() in HEADINGS)
# ---- summary fonds (best effort) ----
fonds = {}
for e in re.split(r"\n\s*(?=Ф\.\s?\d+\.)", "\n".join(lines[i_sum:i_det]))[1:]:
    e1 = " ".join(e.split())
    head = re.split(r"\s[–-]\s", e1, 1)[0]          # header ends at the first " – " bullet
    m = re.match(r"Ф\.\s?(\d+)\.\s*(.*)", head)
    if not m: continue
    code, rest = m.group(1), m.group(2).strip()
    ym = re.search(r",?\s*((?:1[6-9]\d\d(?:\s*[–-]\s*1[6-9]\d\d)?(?:,\s*)?)+)\s*рр?\.", rest)
    fonds[code] = dict(code=code, title=(rest[:ym.start()].strip() if ym else rest.split(";")[0].strip()), years=years_from(ym.group(1)) if ym else [])
# ---- detail blocks ----
det = "\n".join(lines[i_det:]); det = det[:det.find("ПОКАЖЧИК НАСЕЛЕНИХ ПУНКТІВ")] if "ПОКАЖЧИК НАСЕЛЕНИХ ПУНКТІВ" in det else det
conf = None; blocks = []; cur = None
for l in det.split("\n"):
    s = l.strip()
    if s in HEADINGS: conf = s; continue
    m = re.match(r"^(\d{1,2})\.\s*(.*)$", s)
    if m and 1 <= int(m.group(1)) <= 10 and (int(m.group(1)) == 1 or (cur and int(m.group(1)) == cur["last"] + 1)):
        n = int(m.group(1))
        if n == 1: cur = dict(conf=conf, items={}, last=0, last_fond=None, fonds=set()); blocks.append(cur)
        cur["items"][n] = m.group(2); cur["last"] = n
    elif cur: cur["items"][cur["last"]] = cur["items"].get(cur["last"], "") + " " + s
refs = {}; no_fond = 0; dropped = 0
REF = re.compile(r"([^;]+?):\s*(?:ф\.\s*(\d+[а-яА-Я]?)[,.]\s*)?оп\.\s*(\d+[а-яА-Я]?)[,.]\s*спр\.?\s*(\d+[а-яА-Я]?)")
for b in blocks:
    church = " ".join(b["items"].get(3, "").split()); place = " ".join(b["items"].get(1, "").split())
    for n in (5, 6, 7, 8, 9, 10):
        t = " ".join(b["items"].get(n, "").split())
        if not t or t == "–": continue
        for seg in REF.finditer(t):
            yrs, f, op, spr = seg.groups()
            if not f:
                no_fond += 1; f = b["last_fond"]
                if not f: dropped += 1; continue
            b["last_fond"] = f; b["fonds"].add(f)
            r = refs.setdefault((f, op, spr), dict(years=set(), church=church, conf=b["conf"], kinds=set(), labels=set()))
            if n in (9, 10): r["labels"].add(t.split(":")[0].strip()[:80])
            for a, z in years_from(yrs): r["years"].update(range(a, z + 1))
            r["kinds"].add(n)
multi = sum(1 for b in blocks if len(b["fonds"]) > 1)
by_fond = {}
for (f, op, sp) in refs: by_fond[f] = by_fond.get(f, 0) + 1
print(f"{ARCH}: summary fonds {len(fonds)} {sorted(fonds, key=int)[:8]} | blocks {len(blocks)} | справи {len(refs)} | refs w/o ф. {no_fond} (dropped {dropped}) | multi-fond blocks {multi} | confessions {sorted({b['conf'] for b in blocks if b['conf']})}")
print(f"   refs by fond: {sorted(by_fond.items(), key=lambda x: -x[1])[:12]}")
ops = {}
for (f, op, sp) in refs: ops.setdefault(f, set()).add(op)
print(f"   описи per fond: {{k: len(v) for k, v in list(ops.items())[:6]}}")
json.dump(dict(archive=ARCH, fonds=fonds, refs={"-".join(k): dict(years=sorted(v["years"]), church=v["church"], conf=v["conf"], kinds=sorted(v["kinds"]), labels=sorted(v["labels"])) for k, v in refs.items()}), open(OUT, "w"), ensure_ascii=False)
