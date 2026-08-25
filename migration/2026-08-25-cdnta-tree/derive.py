#!/usr/bin/env python3
"""
Derive the ЦДНТА catalog tree from source/rows.tsv (scraped from cdnta-old.archives.gov.ua).

Rules (user-approved, session 2026-08-25):
- fond.code = folded site code (Р-19 -> Р19), Latin homoglyphs -> Cyrillic.
- inventory.code = опис number; duplicates within a fond get Cyrillic letter
  postfix in document order: first bare, then А, Б, В... (Р20-1, Р20-1А, ...).
- НДД pages (opisi-2..5): each table row is a complex; fond title = complex title
  when the fond has exactly one complex, else NULL (complex titles live on inventories).
- ФОП page: fond title = «Назва фонду», inventories have no complex.
- files: expand од.зб. ranges (numeric series + lettered bounds as extra files).

Outputs (same dir): fonds.csv, inventories.csv, file_ranges.csv, report.txt
"""
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'source' / 'rows.tsv'

_ALPHA = list('АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ')
SUFFIXES = _ALPHA + [a + b for a in _ALPHA for b in _ALPHA]
LAT2CYR = str.maketrans('ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')

edge_cases = []


def fold_fond(raw):
    s = raw.strip().upper().translate(LAT2CYR)
    s = re.sub(r'\s+', '', s)
    if re.fullmatch(r'\d+', s):
        # opisi-5 lists fond «251» with no letter prefix — keep as printed
        edge_cases.append(f'DIGIT-ONLY FOND kept as-is: {raw!r}')
        return s
    m = re.fullmatch(r'([А-ЯІЇЄҐ]+)-?(\d+)([А-ЯІЇЄҐ]?)', s)
    if not m:
        edge_cases.append(f'UNPARSED FOND: {raw!r}')
        return None
    return m.group(1) + m.group(2) + m.group(3)


def parse_years(raw):
    ys = re.findall(r'\d{4}', raw or '')
    if not ys:
        return None, None
    return min(ys), max(ys)


def parse_segment(seg):
    """-> (start:int, end:int, extras:[file codes]) or None"""
    s = seg.strip().replace('​', '')
    # '1-303 (258-560)' -> '1-303', log it
    m = re.fullmatch(r'(.*?)\s*\(.*\)', s)
    if m:
        edge_cases.append(f'PARENS RANGE: {seg!r} -> {m.group(1)!r}')
        s = m.group(1).strip()
    m = re.fullmatch(r'(\d+)\s*([а-яіїєґ]?)(?:\s*-\s*(\d+)\s*([а-яіїєґ]?))?', s, re.IGNORECASE)
    if not m:
        return None
    a, al, b, bl = m.group(1), m.group(2), m.group(3), m.group(4)
    start = int(a)
    end = int(b) if b else start
    if end < start:
        edge_cases.append(f'REVERSED RANGE: {seg!r}')
        start, end = end, start
    extras = []
    if al:
        extras.append(a + al.upper())
    if bl and (b, bl) != (a, al):
        extras.append(b + bl.upper())
    return start, end, extras


def main():
    rows = []
    with open(SRC, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            r['seq'] = int(r['seq'])
            rows.append(r)
    rows.sort(key=lambda r: r['seq'])

    for r in rows:
        r['fond_code'] = fold_fond(r['fond_raw'])
    rows = [r for r in rows if r['fond_code']]

    # --- inventory codes: (fond, opys) groups in document order ---
    groups = defaultdict(list)
    for r in rows:
        groups[(r['fond_code'], r['opys'])].append(r)
    for (fond, opys), grp in groups.items():
        for i, r in enumerate(grp):
            if i == 0:
                r['inv_code'] = opys
            elif i <= len(SUFFIXES):
                r['inv_code'] = opys + SUFFIXES[i - 1]
            else:
                sys.exit(f'suffix alphabet exhausted for {fond} оп.{opys}')

    # uniqueness check
    seen = set()
    for r in rows:
        key = (r['fond_code'], r['inv_code'])
        if key in seen:
            sys.exit(f'DUPLICATE inventory code: {key}')
        seen.add(key)

    # --- fonds ---
    fond_rows = defaultdict(list)
    for r in rows:
        fond_rows[r['fond_code']].append(r)
    fonds = {}
    fond_conflicts = []
    for fond, rs in fond_rows.items():
        fop = [r for r in rs if r['page'] == 'opisi-fop']
        ndd = [r for r in rs if r['page'] != 'opisi-fop']
        if fop and ndd:
            fond_conflicts.append(fond)
        if fop:
            titles = sorted({r['title'] for r in fop if r['title']})
            fonds[fond] = titles[0] if titles else ''
        else:
            complexes = sorted({r['complex'] for r in rs})
            titles = sorted({r['title'] for r in rs if r['title']})
            fonds[fond] = titles[0] if len(complexes) == 1 and len(titles) == 1 else ''

    # --- write outputs ---
    with open(HERE / 'fonds.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['fond_code', 'title'])
        for fond in sorted(fonds):
            w.writerow([fond, fonds[fond]])

    n_files_total = 0
    inv_out = []
    seg_out = []
    for r in rows:
        y1, y2 = parse_years(r['years'])
        segs = [s for s in (r['ranges'] or '').split(';') if s.strip()]
        parsed_segs = []
        for s in segs:
            p = parse_segment(s)
            if p is None:
                edge_cases.append(f'UNPARSED RANGE: {s!r} (fond {r["fond_code"]} inv {r["inv_code"]})')
                continue
            parsed_segs.append(p)
            n_files_total += p[1] - p[0] + 1 + len(p[2])
        if r['page'] == 'opisi-fop':
            title = ''
            info = f'од.зб. {r["ranges"]}'
        else:
            title = r['title']
            info = f'к. {r["complex"]}, од.зб. {r["ranges"]}'
        inv_out.append([r['fond_code'], r['inv_code'], r['page'], r['complex'],
                        r['opys'], title, info, y1 or '', y2 or '', r['pdfs']])
        for start, end, extras in parsed_segs:
            seg_out.append([r['fond_code'], r['inv_code'], start, end, ';'.join(extras)])

    with open(HERE / 'inventories.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['fond_code', 'inv_code', 'page', 'complex', 'opys', 'title',
                    'info', 'year_start', 'year_end', 'pdf_urls'])
        w.writerows(inv_out)

    with open(HERE / 'file_ranges.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['fond_code', 'inv_code', 'seg_start', 'seg_end', 'letter_extras'])
        w.writerows(seg_out)

    # --- report ---
    suffixed = [(k, [r['inv_code'] for r in grp]) for k, grp in groups.items() if len(grp) > 1]
    with open(HERE / 'report.txt', 'w', encoding='utf-8') as f:
        f.write(f'inventory rows: {len(rows)}\n')
        f.write(f'fonds: {len(fonds)} (with title: {sum(1 for t in fonds.values() if t)})\n')
        f.write(f'estimated files: {n_files_total}\n')
        f.write(f'range segments: {len(seg_out)}\n')
        f.write(f'fonds on both ФОП and НДД pages: {fond_conflicts or "none"}\n')
        f.write(f'\nsuffixed (fond, опис) groups: {len(suffixed)}\n')
        for (fond, opys), codes in sorted(suffixed):
            f.write(f'  {fond} оп.{opys}: {" ".join(codes)}\n')
        f.write(f'\nedge cases ({len(edge_cases)}):\n')
        for e in edge_cases:
            f.write(f'  {e}\n')
    print(open(HERE / 'report.txt', encoding='utf-8').read()[:3000])


if __name__ == '__main__':
    main()
