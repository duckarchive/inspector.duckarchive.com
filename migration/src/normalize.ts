/**
 * Code normalization for legacy(v1) → new(v2) migration.
 * Mirrors utils/src/parse.ts (parseCode) base cleanup, then applies the
 * confirmed v1→v2 canonicalization rules (see migration/PLAN.md "Decisions").
 */

const LATIN_TO_CYR: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и',
  j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р',
  s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', y: 'и', z: 'з',
};

export type Level = 'fund' | 'description' | 'case';

/** trim, strip leading zeros, latin→cyrillic, uppercase, drop non-alphanumerics */
export const normalizeBase = (raw: string): string =>
  raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^0+(\d)/, '$1')
    .split('')
    .map((ch) => LATIN_TO_CYR[ch.toLowerCase()] ?? ch)
    .join('')
    .toUpperCase()
    .replace(/[^А-ЯҐЄІЇ0-9]/g, '');

const TOM = '\u0001';
const CHAST = '\u0002';
const DOD = '\u0003';
const POSH = '\u0004';

/**
 * Canonical v2 form:
 * - digit-Т-digit → ТОМ, digit-Ч-digit → ЧАСТ (all levels)
 * - trailing digit-Д → ДОД, trailing digit-Ч → ЧАСТ, trailing digit-П → ПОШ
 *   ("пошуковий" — a separate finding-aid опис, not a volume of the base one)
 *   (description level only; at case level trailing letters are alphabet
 *   postfixes А,Б,В,Г,Д… — keep)
 * Existing full tokens (ТОМ/ЧАСТ/ДОД/ПОШ) are protected from double-application.
 */
export const canonicalizeCode = (raw: string, level: Level): string => {
  let code = normalizeBase(raw)
    .replace(/(\d)ТОМ(?=\d)/g, `$1${TOM}`)
    .replace(/(\d)ЧАСТ(?=\d|$)/g, `$1${CHAST}`)
    .replace(/(\d)Т(?=\d)/g, `$1${TOM}`)
    .replace(/(\d)Ч(?=\d)/g, `$1${CHAST}`);
  if (level === 'description') {
    code = code
      .replace(/(\d)ДОД$/, `$1${DOD}`)
      .replace(/(\d)Д$/, `$1${DOD}`)
      .replace(/(\d)Ч$/, `$1${CHAST}`)
      .replace(/(\d)ПОШ$/, `$1${POSH}`)
      .replace(/(\d)П$/, `$1${POSH}`);
  }
  return code
    .replaceAll(TOM, 'ТОМ')
    .replaceAll(CHAST, 'ЧАСТ')
    .replaceAll(DOD, 'ДОД')
    .replaceAll(POSH, 'ПОШ');
};

/** Codes that are dropped entirely (confirmed): test/service garbage with no archival meaning. */
export const SKIP_CODES = new Set(['ТЕСТ', 'ФИЛЕС']);

/** Shape check used for anomaly reporting (not blocking). */
export const isRegularCode = (canonical: string): boolean =>
  /^[А-ЯҐЄІЇ]{0,3}\d+(ТОМ|ЧАСТ|ДОД)?[А-ЯҐЄІЇ]{0,5}\d*$/.test(canonical);

/** Numeric base for sequence-gap analysis; null for fully non-numeric codes. */
export const numericBase = (canonical: string): number | null => {
  const m = canonical.match(/^[А-ЯҐЄІЇ]{0,3}(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

export interface SequenceReport {
  total: number;
  nonNumeric: number;
  min: number | null;
  max: number | null;
  missingCount: number;
  gaps: string; // compact "3-5,17,40-44" preview (first 20 ranges)
}

export const analyzeSequence = (canonicalCodes: string[]): SequenceReport => {
  const bases = new Set<number>();
  let nonNumeric = 0;
  for (const code of canonicalCodes) {
    const base = numericBase(code);
    if (base === null) nonNumeric += 1;
    else bases.add(base);
  }
  const sorted = [...bases].sort((a, b) => a - b);
  const ranges: string[] = [];
  let missingCount = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1] - 1;
    if (gap > 0) {
      missingCount += gap;
      if (ranges.length < 20) {
        const from = sorted[i - 1] + 1;
        const to = sorted[i] - 1;
        ranges.push(from === to ? `${from}` : `${from}-${to}`);
      }
    }
  }
  return {
    total: canonicalCodes.length,
    nonNumeric,
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    missingCount,
    gaps: ranges.join(',') + (missingCount > 0 && ranges.length === 20 ? ',…' : ''),
  };
};

const FS_CODE_PART = /^[\dА-ЯҐЄІЇа-яґєіїA-Za-z]+(?:-[\dА-ЯҐЄІЇа-яґєіїA-Za-z]+){1,2}$/;

/**
 * One "+++" part → "Ф-ОП[-СПР]" code or null (part is descriptive text with no code).
 * Handles: "1-295", "1-295_1913", "51-1-2650_Aug 1764–1765",
 * "Православні церковні документи - Orthodox Church Records_127-208-37-1814".
 */
const extractFsCode = (part: string): string | null => {
  const head = part.split('_')[0].trim();
  if (FS_CODE_PART.test(head)) return head;
  const tail = part.slice(part.lastIndexOf('_') + 1).trim();
  const segs = tail.split('-').map((s) => s.trim());
  if (segs.length >= 3 && segs.slice(0, 3).every((s) => /^[\dА-ЯҐЄІЇа-яґєіїA-Za-z]+$/.test(s))) {
    return segs.slice(0, 3).join('-'); // drop trailing year segments
  }
  return null;
};

/** FamilySearch composite parsed: "АРХ-(Ф-ОП-СПР+++Ф-ОП-СПР_1884-1885)" → canonical full_codes (or null if none found). */
export const parseFamilySearchComposite = (parsed: string): string[] | null => {
  const m = parsed.match(/^([^-]+)-\((.+)\)$/);
  if (!m) return null;
  const [, archive, body] = m;
  const codes = new Set<string>();
  for (const part of body.split('+++')) {
    const code = extractFsCode(part.trim());
    if (!code) continue; // descriptive text without a code — ignore, other parts decide
    const [fund, desc, kase] = code.split('-');
    const canon = [
      archive,
      canonicalizeCode(fund, 'fund'),
      canonicalizeCode(desc, 'description'),
      kase !== undefined ? canonicalizeCode(kase, 'case') : undefined,
    ]
      .filter((s): s is string => s !== undefined && s !== '')
      .join('-');
    codes.add(canon);
  }
  return codes.size ? [...codes] : null;
};

/**
 * Volume/part inventory codes group into their base instance: the catalog keeps one
 * inventory per опис, so ТОМ# / ЧАСТ# / ПР# variants (`1ТОМ16`, `2ПР`) belong to the
 * base inventory (`1`, `2`). NOT ПОШ (canonical form of trailing П) — "пошуковий" is
 * a separate finding-aid опис, matched exactly. Applies to the inventory segment
 * only — case-level trailing letters are alphabet postfixes and stay separate
 * instances (PLAN.md #5). Input must already be canonical. Returns the
 * base-inventory full code, or null when the inventory segment carries no marker.
 */
export const groupedFullCode = (canonFullCode: string): string | null => {
  const segs = canonFullCode.split('-');
  if (segs.length !== 3 && segs.length !== 4) return null;
  const base = segs[2].replace(/(\d)(ТОМ\d*|ЧАСТ\d*|ПР\d*)$/, '$1');
  if (base === segs[2]) return null;
  return [...segs.slice(0, 2), base, ...segs.slice(3)].join('-');
};

/** Canonicalize a plain "АРХ-Ф-ОП[-СПР]" full_code string for matching. */
export const canonicalizeFullCode = (fullCode: string): string | null => {
  const segs = fullCode.split('-');
  // archive codes never contain '-'; funds like "Р1" are one segment after parseCode
  if (segs.length === 4) {
    return [
      segs[0],
      canonicalizeCode(segs[1], 'fund'),
      canonicalizeCode(segs[2], 'description'),
      canonicalizeCode(segs[3], 'case'),
    ].join('-');
  }
  if (segs.length === 3) {
    return [
      segs[0],
      canonicalizeCode(segs[1], 'fund'),
      canonicalizeCode(segs[2], 'description'),
    ].join('-');
  }
  return null;
};
