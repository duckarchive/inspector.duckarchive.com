/**
 * On-the-fly translation of catalog content (Chrome built-in Translator API).
 *
 * The catalog is Ukrainian (with a pre-1917 Russian minority) and is never
 * translated at rest — this is a read-time gist layer for foreign visitors,
 * running fully on-device. It is a progressive enhancement: every entry point
 * degrades to "no translation offered" when the API or a language pair is
 * missing, which is the case on all mobile browsers and non-Chromium desktop.
 *
 * Measured on Chrome 151: ~310 ms to create a translator, ~30 ms per title.
 */

/** Our locale codes are not all BCP-47: `cz` is Czech, whose tag is `cs`. */
const LOCALE_TO_BCP47: Record<string, string> = { cz: "cs" };

export const toBcp47 = (locale: string): string => LOCALE_TO_BCP47[locale] ?? locale;

/** Catalog content is Ukrainian, or Russian for many pre-1917 records. */
export type SourceLanguage = "uk" | "ru";

/**
 * Source-side glossary. Expanding archival shorthand *before* translating is
 * what actually works: the raw model reads «с. Велика Мочулка» as "with. Big
 * Mochulka" and «Ревізька казка» literally as "Revizka fairy tale".
 *
 * Fixing the model's *output* with regexes was tried and rejected — the same
 * phrase comes back worded differently depending on surrounding context
 * ("Revizka Fairytale" vs "Audit fairy tale"), so the patterns silently miss.
 *
 * Note: JS `\b` is ASCII-only and never matches before Cyrillic, hence the
 * explicit boundary group. Lookbehind is avoided so the module parses in
 * older Safari (which never runs this code, but does download the bundle).
 */
const BOUNDARY = `(^|[\\s(«"',;.\\-])`;
const UPPER = "[А-ЯІЇЄҐ]";

const GLOSSARY: [RegExp, string][] = [
  // Settlement prefixes — the biggest single source of nonsense.
  [new RegExp(`${BOUNDARY}с\\.\\s*(?=${UPPER})`, "g"), "$1село "],
  [new RegExp(`${BOUNDARY}м\\.\\s*(?=${UPPER})`, "g"), "$1місто "],
  [new RegExp(`${BOUNDARY}смт\\.?\\s*(?=${UPPER})`, "g"), "$1селище "],
  [new RegExp(`${BOUNDARY}сел\\.\\s*(?=${UPPER})`, "g"), "$1селище "],
  // Sheet counts. Citation shorthand (ф./оп./спр.) is deliberately NOT expanded:
  // «(ф. 315)» already renders as "(f. 315)", while expanding it yields the
  // clumsier "(315 Fund)" — and the shorthand is standard in archival citation.
  [new RegExp(`${BOUNDARY}арк\\.`, "g"), "$1аркушів"],
  // Terms of art, paraphrased into plain Ukrainian the model renders correctly.
  [/ревізьк(а|ої|ій|у) казк(а|и|ці|у)/gi, "ревізійний перепис населення"],
  [/ревізьк(і|их) казк(и|ах)/gi, "ревізійні переписи населення"],
  [/метричн(а|ої|ій|у) книг(а|и|зі|у)/gi, "парафіяльний реєстр актів"],
  [/метричн(і|их) книг(и|ах)/gi, "парафіяльні реєстри актів"],
  [/сповідн(і|их) розпис(и|ів)/gi, "списки парафіян на сповіді"],
  [/сповідальн(і|их) відомост(і|ей)/gi, "списки парафіян на сповіді"],
  [/шлюбн(ий|ого) обшук/gi, "дошлюбне опитування"],
  [/шлюбн(і|их) обшук(и|ів)/gi, "дошлюбні опитування"],
];

export const applyGlossary = (text: string): string =>
  GLOSSARY.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);

export const isTranslationApiPresent = (): boolean =>
  typeof self !== "undefined" && "Translator" in self;

/** Cheap script test — the detector is only worth loading for mixed content. */
const hasRussianOnlyLetters = (text: string) => /[ыэъЫЭЪ]/.test(text);

let detectorPromise: Promise<AILanguageDetector | null> | null = null;

const getDetector = () => {
  if (!detectorPromise) {
    detectorPromise =
      typeof self !== "undefined" && "LanguageDetector" in self
        ? LanguageDetector.create().catch(() => null)
        : Promise.resolve(null);
  }
  return detectorPromise;
};

/**
 * Ukrainian unless the text is confidently Russian. Ukrainian is the default
 * because it is ~97 % of the catalog and the two are close enough that a
 * misroute degrades gracefully.
 */
export const detectSource = async (text: string): Promise<SourceLanguage> => {
  if (hasRussianOnlyLetters(text)) return "ru";
  const detector = await getDetector();
  if (!detector) return "uk";
  try {
    const [top] = await detector.detect(text);
    return top?.detectedLanguage === "ru" && top.confidence > 0.6 ? "ru" : "uk";
  } catch {
    return "uk";
  }
};

const translators = new Map<string, Promise<AITranslator>>();

/**
 * Translators are cached per pair for the page's lifetime — creating one costs
 * ~300 ms, translating with a warm one ~30 ms.
 *
 * `onProgress` only fires while a model is downloading; Chrome requires the
 * call to happen inside a user gesture in that case, so callers must invoke
 * this from a click handler unless availability is already "available".
 */
export const getTranslator = (
  sourceLanguage: SourceLanguage,
  targetLanguage: string,
  onProgress?: (loaded: number) => void,
): Promise<AITranslator> => {
  const key = `${sourceLanguage}->${targetLanguage}`;
  let translator = translators.get(key);
  if (!translator) {
    translator = Translator.create({
      sourceLanguage,
      targetLanguage,
      monitor: onProgress
        ? (monitor) => monitor.addEventListener("downloadprogress", (event) => onProgress(event.loaded))
        : undefined,
    }).catch((error) => {
      // A failed create must not poison the cache — the next gesture retries.
      translators.delete(key);
      throw error;
    });
    translators.set(key, translator);
  }
  return translator;
};

export const getAvailability = async (targetLanguage: string): Promise<AIAvailability> => {
  if (!isTranslationApiPresent()) return "unavailable";
  try {
    return await Translator.availability({ sourceLanguage: "uk", targetLanguage });
  } catch {
    return "unavailable";
  }
};

const cache = new Map<string, string>();

/** Translated text for `targetLanguage`, memoized across the session. */
export const translateContent = async (
  text: string,
  targetLanguage: string,
  onProgress?: (loaded: number) => void,
): Promise<string> => {
  const key = `${targetLanguage}|${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const source = await detectSource(text);
  const translator = await getTranslator(source, targetLanguage, onProgress);
  const result = await translator.translate(applyGlossary(text));

  cache.set(key, result);
  return result;
};
