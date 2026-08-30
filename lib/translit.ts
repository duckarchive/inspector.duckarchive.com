/**
 * Latin → Cyrillic conversion for search input.
 *
 * The catalog is Ukrainian-only and the public API rejects Latin letters
 * outright (lib/validate.ts), so foreign visitors' input is converted on the
 * client before it is submitted — the FamilySearch approach: records stay in
 * the original script, the form transliterates. The converted value replaces
 * the field content, so the user always sees the exact Cyrillic query that ran.
 *
 * Precision is deliberately modest: the search API's pg_trgm word-similarity
 * matching absorbs one-or-two-letter misses, so a greedy longest-match table
 * is enough — no phonetic engine. What matters is that every Latin letter
 * maps to *something* Cyrillic and each locale's spelling habits are honoured
 * («Shevchenko», «Szewczenko» and «Ševčenko» all mean «Шевченко»).
 */

/** Reverse of the KMU-2010 romanization plus intuitive English variants. */
const BASE_RULES: Record<string, string> = {
  shch: "щ",
  sch: "щ",
  zgh: "зг",
  kh: "х",
  ts: "ц",
  ch: "ч",
  sh: "ш",
  zh: "ж",
  yu: "ю",
  iu: "ю",
  ju: "ю",
  ya: "я",
  ia: "я",
  ja: "я",
  ye: "є",
  ie: "є",
  je: "є",
  yi: "ї",
  ji: "ї",
  yo: "йо",
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "е",
  f: "ф",
  g: "ґ",
  h: "г",
  i: "і",
  j: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "кс",
  y: "и",
  z: "з",
};

/**
 * Per-locale spelling habits, checked before the base table. Small tables on
 * purpose — only the digraphs and letters a speaker of that language would
 * naturally use differently from English romanization.
 */
const LOCALE_RULES: Record<string, Record<string, string>> = {
  pl: {
    szcz: "щ",
    sz: "ш",
    cz: "ч",
    rz: "ж",
    ż: "ж",
    ź: "зь",
    ś: "сь",
    ć: "ць",
    ń: "нь",
    ł: "л",
    ó: "у",
    ę: "ен",
    ą: "он",
    ch: "х",
    c: "ц",
    j: "й",
    w: "в",
    y: "и",
  },
  cz: {
    // Czech and Slovak
    šč: "щ",
    š: "ш",
    č: "ч",
    ž: "ж",
    ř: "рж",
    ě: "є",
    ch: "х",
    c: "ц",
    j: "й",
    y: "и",
    ý: "и",
    á: "а",
    é: "е",
    í: "і",
    ú: "у",
    ů: "у",
  },
  ro: {
    ș: "ш",
    ş: "ш",
    ț: "ц",
    ţ: "ц",
    ă: "а",
    î: "и",
    â: "и",
    che: "ке",
    chi: "кі",
    ce: "че",
    ci: "чі",
    ge: "дже",
    gi: "джі",
    j: "ж",
  },
  es: {
    ñ: "нь",
    ll: "й",
    ch: "ч",
    qu: "к",
    ge: "хе",
    gi: "хі",
    j: "х",
    y: "й",
    z: "с",
    á: "а",
    é: "е",
    í: "і",
    ó: "о",
    ú: "у",
  },
  it: {
    sce: "ше",
    sci: "ші",
    che: "ке",
    chi: "кі",
    ce: "че",
    ci: "чі",
    ge: "дже",
    gi: "джі",
    gli: "льї",
    gn: "нь",
    qu: "кв",
    z: "ц",
  },
};

type Rule = [from: string, to: string];

/**
 * KMU-2010 writes я/є/ю/ї as ya/ye/yu/yi only at a word start (mid-word they
 * are ia/ie/iu/i) — and reading them mid-word breaks the most-typed word of
 * all: Kyiv must be к-и-і-в, not к-ї-в. yi is the only one restricted, though:
 * mid-word ya/ye/yu (Tatyana, Zaporizhya) almost always do mean я/є/ю.
 */
const WORD_START_ONLY = new Set(["yi"]);

/**
 * Longest source wins; on a tie the locale overlay beats the base table.
 * A locale that redefines a single letter (es: j→х) also silences base
 * digraphs built on it (ja/je/ji/ju→я/є/ї/ю would contradict it) unless the
 * overlay spells that digraph out itself.
 */
const compileRules = (locale?: string): Rule[] => {
  const overlay = (locale && LOCALE_RULES[locale]) || {};
  const redefinedLetters = new Set(Object.keys(overlay).filter((k) => k.length === 1));
  const merged: Record<string, string> = {};
  for (const [from, to] of Object.entries(BASE_RULES)) {
    if (from.length > 1 && redefinedLetters.has(from[0])) continue;
    merged[from] = to;
  }
  Object.assign(merged, overlay);
  return Object.entries(merged).sort(([a], [b]) => b.length - a.length);
};

const rulesCache = new Map<string, Rule[]>();
const getRules = (locale?: string): Rule[] => {
  const key = locale || "";
  let rules = rulesCache.get(key);
  if (!rules) {
    rules = compileRules(locale);
    rulesCache.set(key, rules);
  }
  return rules;
};

const isUpperAt = (text: string, lower: string, index: number) => text[index] !== lower[index];

/** Latin letters NFD cannot reduce (no combining mark to strip). */
const OPAQUE_LATIN: Record<string, string> = {
  ø: "o",
  đ: "d",
  ð: "d",
  þ: "t",
  ł: "l",
  ß: "ss",
  æ: "ae",
  œ: "oe",
};

/** é → e, ç → c, … (ě, š, ż etc. are explicit rules and never get here). */
const stripDiacritics = (ch: string) => {
  const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return OPAQUE_LATIN[base.toLowerCase()] ?? base;
};

/**
 * Converts Latin text to a Ukrainian Cyrillic guess. Digits, punctuation and
 * existing Cyrillic pass through untouched; capitalization is preserved
 * (an all-caps source chunk yields all-caps output). Any accented Latin
 * letter without an explicit rule degrades to its base letter, so the result
 * never contains a Latin letter or a stray combining mark.
 */
export const latinToCyrillicUk = (input: string, locale?: string): string => {
  const rules = getRules(locale);
  const lower = input.toLowerCase();
  let out = "";
  let i = 0;

  while (i < input.length) {
    const atWordStart = i === 0 || !/[a-zа-яїієґ']/i.test(input[i - 1]);
    let matched: Rule | undefined;
    for (const rule of rules) {
      if (WORD_START_ONLY.has(rule[0]) && !atWordStart) continue;
      if (lower.startsWith(rule[0], i)) {
        matched = rule;
        break;
      }
    }

    if (!matched) {
      const ch = input[i];
      const base = stripDiacritics(ch).toLowerCase();
      if (base !== ch.toLowerCase() && /^[a-z]+$/.test(base)) {
        const to = Array.from(base)
          .map((c) => BASE_RULES[c] ?? c)
          .join("");
        matched = [ch, to];
      } else {
        out += ch;
        i++;
        continue;
      }
    }

    const [from, to] = matched;
    if (isUpperAt(input, lower, i)) {
      // The whole source chunk (or the following letter) being uppercase means
      // an all-caps word — ЦДІАК, not Цдіак; otherwise capitalize normally.
      const nextIdx = i + from.length;
      const restUpper =
        (from.length > 1 && isUpperAt(input, lower, i + 1)) ||
        (nextIdx < input.length && /[a-zа-яїієґ]/i.test(input[nextIdx]) && isUpperAt(input, lower, nextIdx));
      out += restUpper ? to.toUpperCase() : to[0].toUpperCase() + to.slice(1);
    } else {
      out += to;
    }
    i += from.length;
  }

  return out;
};

/**
 * Uppercase Latin look-alikes → Cyrillic, for catalog codes (Р6193 typed with
 * a Latin "P", ЦДІАК with a Latin "A"). Same table the online-copies autolink
 * uses in SQL: translate(upper(x), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ').
 */
const HOMOGLYPHS: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  I: "І",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
  a: "а",
  c: "с",
  e: "е",
  i: "і",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
};

export const foldHomoglyphs = (input: string): string =>
  input.replace(/[A-Za-z]/g, (ch) => HOMOGLYPHS[ch] ?? ch);

export const hasLatin = (input: string): boolean => /[A-Za-z]/.test(input);

/**
 * Resolves an archive code typed in any script: known codes are a closed set,
 * so a Latin-typed code is matched against each code's homoglyph fold and
 * KMU-2010 romanization (ДАХмО ↔ DAKHMO) instead of being guessed at.
 * Returns the canonical Cyrillic code, or undefined when nothing matches.
 */
export const buildArchiveCodeResolver = (codes: string[]): ((input: string) => string | undefined) => {
  const aliases = new Map<string, string>();
  for (const code of codes) {
    const upper = code.toUpperCase();
    aliases.set(upper, code);
    aliases.set(cyrillicToLatinUk(upper), code);
  }
  return (input: string) => {
    const upper = input.trim().toUpperCase();
    return aliases.get(upper) ?? aliases.get(foldHomoglyphs(upper)) ?? aliases.get(cyrillicToLatinUk(upper));
  };
};

/** Forward KMU-2010, only complete enough to build archive-code aliases. */
const TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  "’": "",
  "'": "",
};

export const cyrillicToLatinUk = (input: string): string =>
  Array.from(input)
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = TO_LATIN[lower];
      if (mapped === undefined) return ch;
      return ch === lower ? mapped : mapped.toUpperCase();
    })
    .join("");

/**
 * The one-call conversion for free-text search fields: leaves pure-Cyrillic
 * input alone, transliterates anything containing Latin letters.
 */
export const toCyrillicQuery = (input: string, locale?: string): string =>
  hasLatin(input) ? latinToCyrillicUk(input, locale) : input;

/**
 * Catalog-code conversion (fond/inventory/file boxes): visual look-alikes
 * first — a Latin-typed "P6193" or "11A" means the glyphs, not the sounds —
 * then whatever Latin remains (D, R, S, …) is read phonetically. Codes use
 * г, not ґ, so G is pinned before the phonetic pass.
 */
export const foldCodeInput = (input: string): string => {
  const folded = foldHomoglyphs(input.trim().toUpperCase());
  return hasLatin(folded) ? latinToCyrillicUk(folded.replace(/G/g, "Г")) : folded;
};
