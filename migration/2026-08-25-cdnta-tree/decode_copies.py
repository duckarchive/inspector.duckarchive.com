#!/usr/bin/env python3
"""
Decode FS parsed codes for all ЦДНТА online copies against the derived tree
(inventories.csv + file_ranges.csv) and emit relink targets.

parsed forms (first +++ segment of `ЦДНТА-(ref+++vol+++title)`):
  Р-107-3-36-4-1428  = фонд Р-107, комплекс 3-36, опис 4, справа 1428   (6 tokens)
  Р-17-3-9-119       = фонд Р-17,  комплекс 3-9,  справа 119 -> опис via ranges (5 tokens)
  trailing '-а' letter glues onto справа (10-а -> 10А)

Outputs: relink.csv (copy_id, parsed, ref, fond, complex, inv_code, file_code, method)
         relink-skipped.csv (copy_id, parsed, ref, reason)
         decode-report printed to stdout
"""
import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
LAT2CYR = str.maketrans('ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')

# --- load mapping ---
inv_by_fond_complex = defaultdict(dict)   # (fond, complex) -> {opys: inv_code}
ranges_by_inv = defaultdict(list)         # (fond, inv_code) -> [(start, end)]
with open(HERE / 'inventories.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        inv_by_fond_complex[(r['fond_code'], r['complex'])][r['opys']] = r['inv_code']
with open(HERE / 'file_ranges.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        ranges_by_inv[(r['fond_code'], r['inv_code'])].append(
            (int(r['seg_start']), int(r['seg_end'])))

ok, skipped = [], []
stats = Counter()

with open(HERE / 'source' / 'copies.tsv', newline='', encoding='utf-8') as f:
    for copy_id, parsed, state in csv.reader(f, delimiter='\t'):
        m = re.match(r'^ЦДНТА-\(([^+]+)', parsed)
        ref = (m.group(1) if m else parsed.replace('ЦДНТА-', '', 1)).strip()
        ref = ref.upper().translate(LAT2CYR)
        ref = re.sub(r'\s+', '', ref)
        # fond: letter(s) + number, glued or dashed
        fm = re.match(r'^([А-ЯІЇЄҐ]+)-?(\d+)-(.+)$', ref)
        if not fm:
            skipped.append([copy_id, parsed, ref, 'no fond match'])
            stats['skip:no-fond'] += 1
            continue
        fond = fm.group(1) + fm.group(2)
        rest = fm.group(3).rstrip('_')         # e.g. '3-36-4-1428', '3-9-119', '3-9-10-А', '3-9-5-2943Б'
        toks = rest.split('-')
        # trailing letter: either a separate '-А' token or glued '2943Б'
        letter = ''
        if toks and re.fullmatch(r'[А-ЯІЇЄҐ]', toks[-1]):
            letter = toks[-1]
            toks = toks[:-1]
        elif toks:
            gm = re.fullmatch(r'(\d+)([А-ЯІЇЄҐ])', toks[-1])
            if gm:
                letter = gm.group(2)
                toks = toks[:-1] + [gm.group(1)]
        if len(toks) < 3 or not all(re.fullmatch(r'\d+', t) for t in toks):
            skipped.append([copy_id, parsed, ref, f'unexpected tokens {toks}'])
            stats['skip:tokens'] += 1
            continue
        complex_ = toks[0] + '-' + toks[1]
        opys_map = inv_by_fond_complex.get((fond, complex_))
        if not opys_map:
            skipped.append([copy_id, parsed, ref, f'unknown complex {fond} к.{complex_}'])
            stats['skip:no-complex'] += 1
            continue
        if len(toks) == 4:                     # фонд-к1-к2-опис-справа
            opys, sprava = toks[2], toks[3]
            inv_code = opys_map.get(opys)
            if not inv_code:
                skipped.append([copy_id, parsed, ref,
                                f'опис {opys} not in к.{complex_} (has {sorted(opys_map)})'])
                stats['skip:no-opys'] += 1
                continue
            n = int(sprava)
            in_range = any(a <= n <= b for a, b in ranges_by_inv[(fond, inv_code)])
            stats['6tok:in-range' if in_range else '6tok:OUT-of-range'] += 1
            ok.append([copy_id, parsed, ref, fond, complex_, inv_code,
                       sprava + letter, 'opys-explicit' + ('' if in_range else '+outofrange')])
        elif len(toks) == 3:                   # фонд-к1-к2-справа -> опис via ranges
            n = int(toks[2])
            cands = [ic for op, ic in opys_map.items()
                     if any(a <= n <= b for a, b in ranges_by_inv[(fond, ic)])]
            if len(cands) == 1:
                stats['bareN:unique'] += 1
                ok.append([copy_id, parsed, ref, fond, complex_, cands[0],
                           toks[2] + letter, 'range-lookup'])
            elif not cands:
                stats['bareN:no-range'] += 1
                skipped.append([copy_id, parsed, ref,
                                f'справа {n} outside all ranges of к.{complex_}'])
            else:
                stats['bareN:ambiguous'] += 1
                skipped.append([copy_id, parsed, ref,
                                f'справа {n} in {len(cands)} описи of к.{complex_}: {cands}'])
        else:
            skipped.append([copy_id, parsed, ref, f'{len(toks)} numeric tokens'])
            stats[f'skip:{len(toks)}tok'] += 1

with open(HERE / 'relink.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['copy_id', 'parsed', 'ref', 'fond', 'complex', 'inv_code', 'file_code', 'method'])
    w.writerows(ok)
with open(HERE / 'relink-skipped.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['copy_id', 'parsed', 'ref', 'reason'])
    w.writerows(skipped)

print(f'total copies: {len(ok) + len(skipped)}  -> relink: {len(ok)}, skipped: {len(skipped)}')
for k in sorted(stats):
    print(f'  {k}: {stats[k]}')
targets = Counter((r[3], r[5]) for r in ok)
print('top target inventories:', targets.most_common(8))
