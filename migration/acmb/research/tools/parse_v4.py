"""Generic parser for a «Зведений каталог метричних книг» т.4 archive section (pdftotext output)."""
import re, json, sys
SRC, OUT, ARCH = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(SRC).read()
text = re.sub(r"(?<=[а-яіїєА-ЯІЇЄ])[aceiopxyABCEHIKMOPTXy]|[aceiopxyABCEHIKMOPTXy](?=[а-яіїєА-ЯІЇЄ])", lambda m: m.group(0).translate(str.maketrans("aceiopxyABCEHIKMOPTXy","асеіорхуАВСЕНІКМОРТХу")), text)
text = re.sub(r"\n\s*\d{1,3}\s*\n", "\n", text)                         # page numbers
text = re.sub(r"\n(Міжархівний довідник|Державний архів [^\n]{5,60}області)\s*\n", "\n", text)  # running heads
text = re.sub(r"(\d[–-])\s*\n\s*(?=\d)", r"\1", text)                    # 1854–\n1856
# missing "; " between a справа number and the next year range: "спр. 3201815–1816:" = "спр. 320" + "1815–1816:"
text = re.sub(r"((?:спр|пр)\.?\s*\d{1,4}[а-яА-Я]?)(1[6-9]\d\d)(?=\s*(?:[–-]\s*1[6-9]\d\d)?\s*[:,])", r"\1; \2", text)
# same glitch with a comma: "спр. 450,1833:" / "спр. 1, 1882: ф." — the year that starts the next label is not a справа
text = re.sub(r"((?:спр|пр)\.?\s*[\d\sа-яА-Я,]*?\d[а-яА-Я]?)\s*,\s*(1[6-9]\d\d)(?=\s*(?:[–-]\s*1[6-9]\d\d)?\s*:)", r"\1; \2", text)
lines = text.split("\n")
HEADINGS = {"ПРАВОСЛАВ’Я","ПРАВОСЛАВ'Я","ПРАВОСЛАВ`Я","РИМО-КАТОЛИЦИЗМ","ГРЕКО-КАТОЛИЦИЗМ","ЛЮТЕРАНСТВО","ГРИГОРІАНСТВО","ВІРМЕНО-ГРИГОРІАНСТВО","МЕНОНІТИ","ХРИСТИЯНИ-БАПТИСТИ","ІУДАЇЗМ","ІСЛАМ","ПРОТЕСТАНТИЗМ","СТАРООБРЯДЦІ","СТАРООБРЯДНИЦТВО","КАРАЇМИ","ЄВАНГЕЛЬСЬКІ ХРИСТИЯНИ","ЄВАНГЕЛІЗМ"}
def years_from(s):
    s = re.sub(r"\b\d{2}\.\d{2}\.(1[6-9]\d\d)", r"\1", s)
    s = re.sub(r"[Фф]?[Рр][–\-\s]*\d+", " ", s)     # "ФР–1606" is a fond number, not a year
    out = []
    for m in re.finditer(r"(1[6-9]\d\d)(?:\s*[–-]\s*(1[6-9]\d\d))?", s):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        out.append((a, b))
    return out
i_sum = next((i for i, l in enumerate(lines) if l.startswith("Загальні відомості про фонд")), 0)
i_det = next(i for i, l in enumerate(lines) if l.strip().upper() in HEADINGS)
# ---- summary fonds (best effort) ----
fonds = {}
for e in re.split(r"\n\s*(?=Ф\.\s?\d+\.)", "\n".join(lines[i_sum:i_det]))[1:]:
    e1 = " ".join(e.split())
    head = re.split(r"\s[–-]\s", e1, maxsplit=1)[0]          # header ends at the first " – " bullet
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
    if s.upper() in HEADINGS: conf = s.upper(); continue
    m = re.match(r"^(\d{1,2})\.\s*(.*)$", s)
    if m and 1 <= int(m.group(1)) <= 10 and (int(m.group(1)) == 1 or (cur and int(m.group(1)) == cur["last"] + 1)):
        n = int(m.group(1))
        if n == 1: cur = dict(conf=conf, items={}, last=0, last_fond=None, fonds=set()); blocks.append(cur)
        cur["items"][n] = m.group(2); cur["last"] = n
    elif cur: cur["items"][cur["last"]] = cur["items"].get(cur["last"], "") + " " + s
refs = {}; no_fond = 0; dropped = 0
# fond forms: "ф. 40" | "ф. Р-1606" | "ФР–1606" | "Ф.Р-12"; справа forms: "спр. 22" | "пр.22" | "спр.22а"
# a ref may list several справи: "спр. 539, 541, 544" — all share the label's years and record kind
REF = re.compile(r"([^;]+?):\s*(?:[Фф]\.?\s*((?:[Рр][–\-\s]*)?\d+[а-яА-Я]?)[,.]\s*)?оп\.\s*(\d+[а-яА-Я]?)[,.]\s*(?:спр|пр)\.?\s*(\d+[а-яА-Я]?(?:\s*,\s*\d+[а-яА-Я]?)*)")
def norm_fond(f):
    """DB convention: Р-fonds are 'Р1606' (no dash)."""
    f = re.sub(r"^[Рр][–\-\s]*", "Р", f)
    return f
for b in blocks:
    church = " ".join(b["items"].get(3, "").split()); place = " ".join(b["items"].get(1, "").split())
    for n in (5, 6, 7, 8, 9, 10):
        t = " ".join(b["items"].get(n, "").split())
        if not t or t == "–": continue
        for seg in REF.finditer(t):
            yrs, f, op, spr = seg.groups()
            # a preceding ref with no ";" leaks into the label ("…пр.22 1922–1947:"): drop ф./оп./спр. fragments before reading years
            yrs = re.sub(r"(?:[Фф][Рр]?[.\s–-]*\d+[а-яА-Я]?[,.]\s*)?оп\.\s*\d+[а-яА-Я]?[,.]\s*(?:спр|пр)\.?\s*[\d,\sа-яА-Я]+", " ", yrs)
            if f: f = norm_fond(f)
            if not f:
                no_fond += 1; f = b["last_fond"]
                if not f: dropped += 1; continue
            b["last_fond"] = f; b["fonds"].add(f)
            for one in re.split(r"\s*,\s*", spr):
                if not one: continue
                r = refs.setdefault((f, op, one), dict(years=set(), church=church, conf=b["conf"], kinds=set(), labels=set()))
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
print("   описи per fond: " + str({k: len(v) for k, v in list(ops.items())[:8]}))
json.dump(dict(archive=ARCH, fonds=fonds, refs={"-".join(k): dict(years=sorted(v["years"]), church=v["church"], conf=v["conf"], kinds=sorted(v["kinds"]), labels=sorted(v["labels"])) for k, v in refs.items()}), open(OUT, "w"), ensure_ascii=False)
