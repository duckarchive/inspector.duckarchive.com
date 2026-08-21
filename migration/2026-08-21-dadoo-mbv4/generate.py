"""Generates migration.sql (+ CSV inputs) for the ДАДоО cleanup from the parsed catalog and the DB snapshot."""
import json, csv, re, os
from collections import Counter, defaultdict
H = os.path.dirname(os.path.abspath(__file__)); A = f"{H}/analysis"
pdf = json.load(open(f"{A}/catalog-parsed.json")); PF, PR = pdf["fonds"], pdf["refs"]
tsv = lambda n: list(csv.reader(open(f"{A}/{n}"), delimiter="\t", quoting=csv.QUOTE_NONE))
DF = {r[0]: r for r in tsv("db-fonds.tsv")}
DFL = {(r[0], r[1], r[2]): r for r in tsv("db-files.tsv")}
ARCH = "ДАДоО"
fc = lambda f, op, sp: f"{ARCH}-{f}-{op}-{sp}"
q = lambda s: "'" + s.replace("'", "''") + "'"
def ranges(years):
    ys = sorted(set(years)); out = []
    for y in ys:
        if out and y == out[-1][1] + 1: out[-1][1] = y
        else: out.append([y, y])
    return out
def yrs_db(s):
    o = set()
    for a, b in re.findall(r"(\d{4})-(\d{4})", s): o.update(range(int(a), int(b) + 1))
    return o
KIND_TAG = {5: "народження", 6: "шлюб", 7: "розлучення", 8: "смерть"}
def tags_for(ref):
    t = [KIND_TAG[k] for k in ref["kinds"] if k in KIND_TAG]
    labels = " ".join(ref["labels"]).lower()
    if "обшук" in labels: t.append("шлюбні обшуки")
    if "сповід" in labels: t.append("сповідальні відомості")
    if any(k in KIND_TAG for k in ref["kinds"]): t.insert(0, "метрична книга")
    return t
def title_for(ref, fond):
    """Sibling title when the fond already has a 'Метрична книга. …' title; else build from the catalog church line."""
    if any(k in KIND_TAG for k in ref["kinds"]):
        sib = Counter(r[3] for k, r in DFL.items() if k[0] == fond and r[3].startswith("Метрична книга")).most_common(1)
        return sib[0][0] if sib else f"Метрична книга. {ref['church']}"
    labels = " ".join(ref["labels"]).lower()
    if "обшук" in labels: return f"Книга шлюбних обшуків. {ref['church']}"
    if "сповід" in labels: return f"Сповідальні відомості. {ref['church']}"
    if not ref["labels"]: return ref["church"]
    label = ref["labels"][0]
    place = ref["church"].split(", ", 1)[1] if ", " in ref["church"] else ref["church"]
    # label already names the church ("Список віруючих Троїцької церкви") -> append only the place
    return f"{label}, {place}" if "церкв" in label.lower() else f"{label}. {ref['church']}"
pg_arr = lambda tags: "ARRAY[" + ",".join(q(t) for t in tags) + "]::text[]" if tags else "'{}'::text[]"

# ---------- A. glued ----------
glued = []
for (f, op, code), r in DFL.items():
    if f not in PF or fc(f, op, code) in PR or not (op != "1" or len(code) > 3): continue
    dby = yrs_db(r[4])
    cands = ([f"{f}-1-{code}"] if op != "1" else []) + [f"{f}-1-{code[:n]}" for n in range(len(code) - 1, 0, -1)]
    inpr = [c for c in cands if c in PR]
    tgt = next((c for c in inpr if not dby or set(PR[c]["years"]) & dby), None)
    if not tgt and op != "1" and (f, "1", code) in DFL: tgt = f"{f}-1-{code}"   # 260-1-48: in OCR text only
    assert tgt, (f, op, code)
    tf, top, tc = tgt.split("-")
    glued.append((fc(f, op, code), fc(tf, top, tc), "delete-into-existing" if (tf, top, tc) in DFL else "rename"))
glued.append((fc("155", "1", "110"), fc("155", "1", "1"), "rename"))
glued_invs = sorted({(s.split("-")[1], s.split("-")[2]) for s, _, _ in glued if s.split("-")[2] != "1"}, key=lambda x: int(x[0]))

# ---------- D. missing ----------
missing = []
for k, v in PR.items():
    f, op, sp = k.split("-")
    if f in ("1", "74") or (f, op, sp) in DFL: continue
    if any(t == fc(f, op, sp) for _, t, a in glued if a == "rename"): continue
    missing.append((f, op, sp, title_for(v, f), tags_for(v), ranges(v["years"])))
# 121-1-1 label: "Список віруючих Троїцької церкви"
# ---------- C. fonds ----------
fond_titles = [(c, PF[c]["title"]) for c in PF if c in DF and not DF[c][1].strip()]
fond_titles.append(("204", PF["204"]["title"]))
fond_years = [(c, ranges(y for a, b in PF[c]["years"] for y in range(a, b + 1))) for c in PF if c in DF and not DF[c][3].strip() and PF[c]["years"]]
# ---------- B. bare ----------
bare = []
merge_targets = {t for _, t, a in glued if a == "delete-into-existing"}
for k, v in PR.items():
    f, op, sp = k.split("-")
    if f in ("1", "74"): continue
    d = DFL.get((f, op, sp))
    if not d: continue
    need_title, need_tags, need_years = not d[3].strip(), not d[5].strip(), not d[4].strip()
    if not (need_title or need_tags or need_years): continue
    if fc(f, op, sp) in merge_targets and f in ("451", "260"): continue  # filled by the merge in A
    bare.append((fc(f, op, sp), title_for(v, f) if need_title else "", tags_for(v) if need_tags else [], ranges(v["years"]) if need_years and v["years"] else []))

# ---------- CSVs ----------
with open(f"{H}/01-glued.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["glued_full_code", "target_full_code", "action"]); w.writerows(glued)
with open(f"{H}/02-missing-files.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["fond", "inventory", "file", "title", "tags", "years"])
    for f, op, sp, t, tg, yr in missing: w.writerow([f, op, sp, t, "|".join(tg), ",".join(f"{a}-{b}" for a, b in yr)])
with open(f"{H}/03-fonds.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["fond", "title", "years"])
    allc = sorted(set(c for c, _ in fond_titles) | set(c for c, _ in fond_years), key=int)
    ft = dict(fond_titles); fy = dict(fond_years)
    for c in allc: w.writerow([c, ft.get(c, ""), ",".join(f"{a}-{b}" for a, b in fy.get(c, []))])
with open(f"{H}/04-bare-files.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["full_code", "title", "tags", "years"])
    for k, t, tg, yr in bare: w.writerow([k, t, "|".join(tg), ",".join(f"{a}-{b}" for a, b in yr)])

# ---------- SQL ----------
S = []; P = S.append
P("-- ДАДоО cleanup against «Зведений каталог метричних книг», т. 4 (2012). Generated by generate.py; inputs in 0*.csv.")
P("BEGIN;")
P("CREATE TEMP TABLE dadoo_archive AS SELECT id FROM archives WHERE code = " + q(ARCH) + ";")
P("DO $$ BEGIN IF (SELECT count(*) FROM dadoo_archive) <> 1 THEN RAISE EXCEPTION 'archive not found'; END IF; END $$;")
# A
P("\n-- A. glued codes")
P("CREATE TEMP TABLE mg(src text, dst text, action text);")
P("INSERT INTO mg VALUES " + ",\n".join(f"({q(s)},{q(t)},{q(a)})" for s, t, a in glued) + ";")
P("CREATE TEMP TABLE g AS SELECT m.*, s.id AS src_id, d.id AS dst_id FROM mg m JOIN files s ON s.full_code = m.src LEFT JOIN files d ON d.full_code = m.dst;")
P("""DO $$ BEGIN
  IF (SELECT count(*) FROM g) <> (SELECT count(*) FROM mg) THEN RAISE EXCEPTION 'glued source missing'; END IF;
  IF EXISTS (SELECT 1 FROM g WHERE action = 'delete-into-existing' AND dst_id IS NULL) THEN RAISE EXCEPTION 'merge target missing'; END IF;
  IF EXISTS (SELECT 1 FROM g WHERE action = 'rename' AND dst_id IS NOT NULL) THEN RAISE EXCEPTION 'rename target exists'; END IF;
END $$;""")
P("-- move relations of duplicates onto the real file")
P("DELETE FROM online_copies oc USING g WHERE oc.file_id = g.src_id AND g.dst_id IS NOT NULL AND EXISTS (SELECT 1 FROM online_copies d WHERE d.file_id = g.dst_id AND d.resource_id = oc.resource_id AND d.url = oc.url AND d.parsed = oc.parsed);")
P("UPDATE online_copies oc SET file_id = g.dst_id FROM g WHERE oc.file_id = g.src_id AND g.dst_id IS NOT NULL;")
P("INSERT INTO file_authors (file_id, author_id) SELECT g.dst_id, fa.author_id FROM file_authors fa JOIN g ON fa.file_id = g.src_id WHERE g.dst_id IS NOT NULL ON CONFLICT DO NOTHING;")
P("DELETE FROM file_authors fa USING g WHERE fa.file_id = g.src_id AND g.dst_id IS NOT NULL;")
P("INSERT INTO file_locations (lat, lng, radius_m, file_id) SELECT l.lat, l.lng, l.radius_m, g.dst_id FROM file_locations l JOIN g ON l.file_id = g.src_id WHERE g.dst_id IS NOT NULL ON CONFLICT DO NOTHING;")
P("UPDATE file_actions x SET file_id = g.dst_id FROM g WHERE x.file_id = g.src_id AND g.dst_id IS NOT NULL;")
P("-- bare targets (451-1-2, 260-1-48) take title/tags/years from the glued duplicate")
P("UPDATE files d SET title = CASE WHEN coalesce(d.title,'') = '' THEN s.title ELSE d.title END, tags = CASE WHEN cardinality(d.tags) = 0 THEN s.tags ELSE d.tags END FROM g JOIN files s ON s.id = g.src_id WHERE d.id = g.dst_id;")
P("INSERT INTO file_years (file_id, start_year, end_year) SELECT g.dst_id, y.start_year, y.end_year FROM file_years y JOIN g ON y.file_id = g.src_id WHERE g.dst_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM file_years d WHERE d.file_id = g.dst_id) ON CONFLICT DO NOTHING;")
P("DELETE FROM files f USING g WHERE f.id = g.src_id AND g.dst_id IS NOT NULL;")
P("-- renames: real code, inventory 1 of the fond, full_code")
P("""UPDATE files f SET code = split_part(g.dst, '-', 4), full_code = g.dst,
  inventory_id = (SELECT i.id FROM inventories i JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id WHERE fo.code = split_part(g.dst, '-', 2) AND i.code = split_part(g.dst, '-', 3))
FROM g WHERE f.id = g.src_id AND g.dst_id IS NULL;""")
P("DO $$ BEGIN IF EXISTS (SELECT 1 FROM files f JOIN g ON f.id = g.src_id WHERE f.inventory_id IS NULL) THEN RAISE EXCEPTION 'rename: inventory 1 missing'; END IF; END $$;")
P("-- phantom inventories (оп. 1 + page number), now empty")
P("CREATE TEMP TABLE gi(fond text, inv text); INSERT INTO gi VALUES " + ",".join(f"({q(f)},{q(i)})" for f, i in glued_invs) + ";")
P("""DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM inventories i JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id JOIN gi ON gi.fond = fo.code AND gi.inv = i.code
             WHERE EXISTS (SELECT 1 FROM files WHERE inventory_id = i.id) OR EXISTS (SELECT 1 FROM online_copies WHERE inventory_id = i.id) OR EXISTS (SELECT 1 FROM inventory_actions WHERE inventory_id = i.id))
  THEN RAISE EXCEPTION 'phantom inventory not empty'; END IF; END $$;""")
P("DELETE FROM inventories i USING fonds fo, dadoo_archive a, gi WHERE i.fond_id = fo.id AND fo.archive_id = a.id AND gi.fond = fo.code AND gi.inv = i.code;")
# D
P("\n-- D. справи present in the catalog but missing in the DB")
P("INSERT INTO inventories (code, fond_id) SELECT '1', fo.id FROM fonds fo JOIN dadoo_archive a ON a.id = fo.archive_id WHERE fo.code = '121' AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id = fo.id AND i.code = '1');")
P("CREATE TEMP TABLE mf(fond text, inv text, code text, title text, tags text[], years text);")
P("INSERT INTO mf VALUES " + ",\n".join(f"({q(f)},{q(op)},{q(sp)},{q(t)},{pg_arr(tg)},{q(','.join(f'{a}-{b}' for a, b in yr))})" for f, op, sp, t, tg, yr in missing) + ";")
P("""INSERT INTO files (code, full_code, title, tags, inventory_id)
SELECT mf.code, 'ДАДоО-' || mf.fond || '-' || mf.inv || '-' || mf.code, mf.title, mf.tags, i.id
FROM mf JOIN fonds fo ON fo.code = mf.fond JOIN dadoo_archive a ON a.id = fo.archive_id JOIN inventories i ON i.fond_id = fo.id AND i.code = mf.inv;""")
P("""INSERT INTO file_years (file_id, start_year, end_year)
SELECT f.id, split_part(r, '-', 1)::int, split_part(r, '-', 2)::int FROM mf JOIN files f ON f.full_code = 'ДАДоО-' || mf.fond || '-' || mf.inv || '-' || mf.code, unnest(string_to_array(mf.years, ',')) r WHERE mf.years <> '' ON CONFLICT DO NOTHING;""")
P("DO $$ BEGIN IF (SELECT count(*) FROM mf JOIN files f ON f.full_code = 'ДАДоО-' || mf.fond || '-' || mf.inv || '-' || mf.code) <> (SELECT count(*) FROM mf) THEN RAISE EXCEPTION 'missing files not created'; END IF; END $$;")
# C
P("\n-- C. fond titles (empty ones + Ф. 204) and fond year ranges (fonds without any)")
P("CREATE TEMP TABLE ft(fond text, title text); INSERT INTO ft VALUES " + ",\n".join(f"({q(c)},{q(t)})" for c, t in fond_titles) + ";")
P("UPDATE fonds fo SET title = ft.title FROM ft, dadoo_archive a WHERE fo.archive_id = a.id AND fo.code = ft.fond AND (coalesce(fo.title,'') = '' OR fo.code = '204');")
P("CREATE TEMP TABLE fy(fond text, s int, e int); INSERT INTO fy VALUES " + ",\n".join(f"({q(c)},{a},{b})" for c, yrs in fond_years for a, b in yrs) + ";")
P("INSERT INTO fond_years (fond_id, start_year, end_year) SELECT fo.id, fy.s, fy.e FROM fy JOIN fonds fo ON fo.code = fy.fond JOIN dadoo_archive a ON a.id = fo.archive_id WHERE NOT EXISTS (SELECT 1 FROM fond_years y WHERE y.fond_id = fo.id) ON CONFLICT DO NOTHING;")
# B
P("\n-- B. bare files: title / tags / years from the catalog (only where empty)")
P("CREATE TEMP TABLE bf(full_code text, title text, tags text[], years text);")
P("INSERT INTO bf VALUES " + ",\n".join(f"({q(k)},{q(t)},{pg_arr(tg)},{q(','.join(f'{a}-{b}' for a, b in yr))})" for k, t, tg, yr in bare) + ";")
P("UPDATE files f SET title = bf.title FROM bf WHERE f.full_code = bf.full_code AND bf.title <> '' AND coalesce(f.title,'') = '';")
P("UPDATE files f SET tags = bf.tags FROM bf WHERE f.full_code = bf.full_code AND cardinality(bf.tags) > 0 AND cardinality(f.tags) = 0;")
P("INSERT INTO file_years (file_id, start_year, end_year) SELECT f.id, split_part(r, '-', 1)::int, split_part(r, '-', 2)::int FROM bf JOIN files f ON f.full_code = bf.full_code, unnest(string_to_array(bf.years, ',')) r WHERE bf.years <> '' AND NOT EXISTS (SELECT 1 FROM file_years y WHERE y.file_id = f.id) ON CONFLICT DO NOTHING;")
# summary
P("""\n-- summary
SELECT 'fonds' k, count(*) FROM fonds fo JOIN dadoo_archive a ON a.id = fo.archive_id
UNION ALL SELECT 'fonds w/o title', count(*) FROM fonds fo JOIN dadoo_archive a ON a.id = fo.archive_id WHERE coalesce(title,'') = ''
UNION ALL SELECT 'fonds with years', count(DISTINCT fo.id) FROM fonds fo JOIN dadoo_archive a ON a.id = fo.archive_id JOIN fond_years y ON y.fond_id = fo.id
UNION ALL SELECT 'inventories', count(*) FROM inventories i JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id
UNION ALL SELECT 'files', count(*) FROM files f JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id
UNION ALL SELECT 'files w/o title', count(*) FROM files f JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id WHERE coalesce(f.title,'') = ''
UNION ALL SELECT 'files w/o years', count(*) FROM files f JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id WHERE NOT EXISTS (SELECT 1 FROM file_years y WHERE y.file_id = f.id)
UNION ALL SELECT 'files tagged MK', count(*) FROM files f JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id WHERE 'метрична книга' = ANY(f.tags)
UNION ALL SELECT 'online copies (files)', count(*) FROM online_copies oc JOIN files f ON f.id = oc.file_id JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id
UNION ALL SELECT 'file_authors', count(*) FROM file_authors fa JOIN files f ON f.id = fa.file_id JOIN inventories i ON i.id = f.inventory_id JOIN fonds fo ON fo.id = i.fond_id JOIN dadoo_archive a ON a.id = fo.archive_id;""")
open(f"{H}/migration.sql", "w").write("\n".join(S) + "\n")
print(f"glued: {len(glued)} ({sum(1 for _,_,a in glued if a=='rename')} renames) | phantom inventories: {len(glued_invs)} | missing files: {len(missing)} | fond titles: {len(fond_titles)} | fond year sets: {len(fond_years)} | bare files: {len(bare)}")
for m in missing: print("  D:", m[0], m[1], m[2], "|", m[3][:70], "|", m[4], "|", m[5])
print("  B sample:"); [print("    ", b[0], "|", b[1][:60], "|", b[2], "|", b[3][:2]) for b in bare[:6]]
print("  B title-from-catalog (no sibling):", [b for b in bare if b[1].startswith("Метрична книга. ") and not any(r[3]==b[1] for r in DFL.values())][:5])
