#!/usr/bin/env python3
"""Parse source.csv (Списки парафіян греко-католицької церкви) into staging.csv.

Output columns: archive_code, fond_code, inv_code, file_code, title, info, start_year, end_year
- НМЛ,РКЛ-XXX  -> НМЛШ / РКЛ / 1 / XXX
- ЦДІАЛ,F-I-N  -> ЦДІАЛ / F / upper(I) / N   (1а->1А, 4а->4А)
"""
import csv
import re
import unicodedata

def norm(s: str) -> str:
    s = s.replace("\xa0", " ")
    return re.sub(r"[ \t]+", " ", s).strip()

def squash(s: str) -> str:
    """lowercase, drop punctuation/spaces — for redundancy checks"""
    s = norm(s).lower()
    return re.sub(r"[^\wа-яіїєґ]+", "", s)

rows = list(csv.reader(open("source.csv")))[1:]
out = []
for arch, code, title, years, place, sheets, notes in rows:
    arch, code, title, years, place, sheets, notes = (
        norm(arch), norm(code), norm(title), norm(years),
        place.replace("\xa0", " ").strip(), norm(sheets), norm(notes))
    if not arch:
        raise SystemExit(f"row without archive: {code}")

    if arch == "НМЛ":
        m = re.fullmatch(r"РКЛ-(\d+)", code)
        assert m, code
        archive_code, fond, inv, fcode = "НМЛШ", "РКЛ", "1", m.group(1)
    elif arch == "ЦДІАЛ":
        m = re.fullmatch(r"(\d+)-(\d+[а-яА-Я]?)-(\d+)", code)
        assert m, code
        archive_code, fond, inv, fcode = "ЦДІАЛ", m.group(1), m.group(2).upper(), m.group(3)
    else:
        raise SystemExit(f"unknown archive: {arch}")

    if title.lower() in ("", "невідомо"):
        title = ""

    # place: first line is the settlement/deanery, the rest (deanery
    # composition text) always goes to info
    place_lines = place.split("\n", 1)
    place_short = norm(place_lines[0])
    place_details = place_lines[1].strip() if len(place_lines) > 1 else ""

    info_parts = []
    if re.fullmatch(r"[?]+", place_short):  # e.g. "?????" on 201-4а-3212
        place_short = ""
    if place_short and squash(place_short) not in squash(title):
        info_parts.append(f"Населений пункт / деканат: {place_short}")
    if sheets and sheets.lower() not in ("невідомо", "не вказано"):
        info_parts.append(f"Аркушів: {sheets}")
    if place_details and place_details.lower() != "todo":
        info_parts.append(re.sub(r"\n{3,}", "\n\n", place_details))
    if notes:
        info_parts.append(f"Примітки: {notes}")
    info = "\n\n".join(info_parts)

    y1 = y2 = ""
    m = re.fullmatch(r"(\d{4})(?:-(\d{4}))?", years)
    if m:
        y1 = m.group(1)
        y2 = m.group(2) or y1
    elif years and years != "не вказано":
        raise SystemExit(f"unparsed years {years!r} at {code}")

    out.append([archive_code, fond, inv, fcode, title, info, y1, y2])

# sanity: unique (archive, fond, inv, file)
keys = [tuple(r[:4]) for r in out]
assert len(keys) == len(set(keys)), "duplicate file codes"

with open("staging.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["archive_code", "fond_code", "inv_code", "file_code",
                "title", "info", "start_year", "end_year"])
    w.writerows(out)

from collections import Counter
print(Counter((r[0], r[1], r[2]) for r in out))
print("total:", len(out), "| with years:", sum(1 for r in out if r[6]),
      "| with info:", sum(1 for r in out if r[5]), "| no title:", sum(1 for r in out if not r[4]))
