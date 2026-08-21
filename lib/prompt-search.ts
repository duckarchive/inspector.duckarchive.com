import qs from "qs";
import { SearchRequest } from "@/app/api/search/route";
import { searchVocab } from "@/data/search-vocab";

/*
 * Home-page query parsing with Chrome's built-in Prompt API (Gemini Nano,
 * https://developer.chrome.com/docs/ai/prompt-api). The model turns a free-text
 * query ("метричні книги Вінниця 1890-1900") into the structured filters the
 * search page already understands, so the user lands on /search with the
 * archive, place, years and tags pre-filled instead of a bare title match.
 *
 * It is strictly progressive: the model is used only when it is already on the
 * device (`availability() === "available"`). "downloadable" would start a
 * multi-GB download from a casual search, so that counts as unavailable here.
 * Any failure — no API, unsupported input, timeout — falls back to the plain
 * title search the page always had.
 *
 * Latency note: the system prompt is processed when the session is *created*
 * (measured ~9 s for ~700 tokens on a laptop), while a prompt against a ready
 * session answers in 1–3 s. So the session is warmed up once at page load and
 * each query runs against a clone of it; the submit path never pays for the
 * system prompt.
 */

// The Prompt API isn't in lib.dom yet; this is the subset used here.
type LanguageModelAvailability = "unavailable" | "downloadable" | "downloading" | "available";

interface LanguageModelExpectation {
  type: "text" | "image" | "audio";
  languages?: string[];
}

interface LanguageModelCreateOptions {
  initialPrompts?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  expectedInputs?: LanguageModelExpectation[];
  expectedOutputs?: LanguageModelExpectation[];
  signal?: AbortSignal;
}

interface LanguageModelPromptOptions {
  responseConstraint?: object;
  omitResponseConstraintInput?: boolean;
  signal?: AbortSignal;
}

interface LanguageModelSession {
  prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>;
  clone?(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(
    options?: Pick<LanguageModelCreateOptions, "expectedInputs" | "expectedOutputs">,
  ): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

const getLanguageModel = (): LanguageModelStatic | undefined =>
  (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;

// Ukrainian isn't among the languages the API lets you declare (en/ja/es/de/fr),
// and declaring an unsupported one makes availability() report "unavailable"
// everywhere. The model handles Cyrillic input fine in practice, so the session
// is declared as English and the system prompt tells it to copy Ukrainian
// values through verbatim.
const LANGUAGE_EXPECTATIONS: LanguageModelExpectation[] = [{ type: "text", languages: ["en"] }];

/** True only when the model can answer right now, without triggering a download. */
export const isPromptApiAvailable = async (): Promise<boolean> => {
  const languageModel = getLanguageModel();
  if (!languageModel) {
    return false;
  }
  try {
    const availability = await languageModel.availability({
      expectedInputs: LANGUAGE_EXPECTATIONS,
      expectedOutputs: LANGUAGE_EXPECTATIONS,
    });
    return availability === "available";
  } catch {
    return false;
  }
};

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1000;
const MAX_TEXT_LENGTH = 200;

const archiveCodes = searchVocab.archives.map((archive) => archive.code);
const knownTags = new Set(searchVocab.tags);

/**
 * JSON schema handed to the model as `responseConstraint`. The tag is an enum
 * from the build-time vocabulary, so the model can only pick values the search
 * page can actually filter on (left out when the vocabulary is empty — an empty
 * enum is an invalid schema). It is a single value on purpose: given an array
 * the model pads "метрична книга" with every related tag, and the search API
 * ANDs tags together, which empties the result set.
 *
 * Archive codes are deliberately NOT an enum: a 43-value Cyrillic enum makes
 * Chrome's constraint compiler fail the whole prompt (`kErrorUnknown`, measured
 * on Chrome 148). The system prompt lists the codes instead and the model
 * reliably emits the right one; `sanitizeExtractedFilters` drops anything that
 * isn't an exact known code.
 */
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    author: { type: "string" },
    place: { type: "string" },
    // No minimum/maximum here: given bounds, the model pins the open end of a
    // range ("до 1850") to them instead of omitting it. Range is checked below.
    year_from: { type: "integer" },
    year_to: { type: "integer" },
    archive: { type: "string" },
    fond: { type: "string" },
    inventory: { type: "string" },
    file: { type: "string" },
    ...(knownTags.size ? { tag: { type: "string", enum: searchVocab.tags } } : {}),
    is_online: { type: "boolean" },
  },
};

/**
 * "Державний архів Вінницької області" → "Вінницької". Every token in the
 * system prompt is paid for at session creation, and the boilerplate carries
 * no signal the model needs to map a region to its code.
 */
const compactArchiveLabel = (title: string | null): string =>
  (title ?? "")
    .replace(/^(Галузевий державний архів|Центральний державний|Державний архів|Комунальна установа)\s+/, "")
    // Lookaheads rather than `\b`: JS word boundaries are ASCII-only and never fire after Cyrillic.
    .replace(/\s+України(?=\s|$)/g, "")
    .replace(/\s+області(?=\s|$)/g, "")
    .replace(/["«»]/g, "")
    .trim();

/**
 * "Харківської" → "харків", "Вінницької" → "вінни": the stem that a query's
 * adjective ("Харківський архів") starts with. Only oblast-style labels have
 * one; the others are only ever matched by code.
 */
const archiveStems = searchVocab.archives.flatMap((archive) => {
  const match = compactArchiveLabel(archive.title)
    .toLocaleLowerCase()
    .match(/^([Ѐ-ӿ-]+?)(сь|ць|зь)кої$/);
  return match && match[1].length >= 3 ? [{ code: archive.code, stem: match[1] }] : [];
});

/**
 * Archive mentions are regular enough to spot without the model: the literal
 * code ("ДАВіО"), or a region adjective next to "архів" ("Вінницький архів").
 * The model tends to turn the latter into a place instead, so this runs on the
 * raw query and wins over whatever the model said.
 */
const detectArchive = (query: string): { code: string; stem?: string } | undefined => {
  const words = query.toLocaleLowerCase().split(/[^Ѐ-ӿa-z0-9-]+/);
  const byCode = searchVocab.archives.find((archive) => words.includes(archive.code.toLocaleLowerCase()));
  if (byCode) {
    return { code: byCode.code };
  }
  if (!words.some((word) => word.startsWith("архів"))) {
    return undefined;
  }
  return archiveStems.find(({ stem }) =>
    words.some((word) => word.startsWith(stem) && /^(сь|ць|зь)к/.test(word.slice(stem.length))),
  );
};

const buildSystemPrompt = () => {
  const archiveList = searchVocab.archives
    .map((archive) => `${archive.code}=${compactArchiveLabel(archive.title)}`)
    .join("; ");
  const tagList = searchVocab.tags.join("; ");

  return [
    "Turn a free-text query about Ukrainian archival records into JSON search filters.",
    "The query is usually Ukrainian: copy Ukrainian words into string fields verbatim, never translate.",
    "title: at most 3 keywords as they would literally appear in a document title; omit when tag already captures the record type; never include places, years or archive names.",
    "author: only a proper name of a church, parish, institution or person written in the query (e.g. Свято-Покровська церква); never a generic word.",
    "place: a settlement explicitly named in the query, in Ukrainian nominative case (Вінниця, not Вінниці); never derive it from an archive or region name.",
    "year_from/year_to: a year range; a single year sets both; 'до 1900' sets only year_to, 'після 1900' only year_from; '1890-ті' is 1890–1899.",
    `archive: only when the query names the archive or its region. code=region: ${archiveList}.`,
    "fond/inventory/file: catalog numbers only when written explicitly (фонд 127 опис 1 справа 5; ф. 127 оп. 1 спр. 5).",
    `tag: the single best-matching record type or confession from this list, only when clearly implied: ${tagList}. Record types such as метрична книга belong in tag, not title.`,
    "is_online: true only when the query asks for records available online / with scans.",
    "Never invent values; when unsure, omit the field.",
  ].join("\n");
};

const createSession = async (): Promise<LanguageModelSession | null> => {
  const languageModel = getLanguageModel();
  if (!languageModel || !(await isPromptApiAvailable())) {
    return null;
  }
  try {
    return await languageModel.create({
      initialPrompts: [{ role: "system", content: buildSystemPrompt() }],
      expectedInputs: LANGUAGE_EXPECTATIONS,
      expectedOutputs: LANGUAGE_EXPECTATIONS,
    });
  } catch {
    return null;
  }
};

let warmSession: Promise<LanguageModelSession | null> | undefined;

/**
 * Starts creating the session (and paying for the system prompt) in the
 * background. Idempotent and module-scoped, so it survives the home page
 * re-mounting and a second visit reuses the ready session.
 */
export const warmUpPromptSession = (): Promise<LanguageModelSession | null> => {
  warmSession ??= createSession();
  return warmSession;
};

/**
 * Once Chrome refuses to clone the base session (InvalidStateError — its
 * per-origin session budget is spent, or the session is in a bad state) it is
 * no use to anyone; drop it so the next query warms a fresh one instead of
 * failing forever. A merely *failed prompt* leaves the base usable, so that
 * case keeps it.
 */
const discardWarmSession = (session: LanguageModelSession) => {
  warmSession = undefined;
  try {
    session.destroy();
  } catch {
    // Already gone — nothing to release.
  }
};

const cleanText = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().slice(0, MAX_TEXT_LENGTH);
  return trimmed || undefined;
};

/**
 * A title is a single ILIKE substring on the server, so a long phrase almost
 * never matches a real document title; past four words the model has usually
 * echoed the whole query, and the caller's fallback does that better.
 */
const cleanTitle = (value: unknown): string | undefined => {
  const text = cleanText(value);
  return text && text.split(/\s+/).length <= 4 ? text : undefined;
};

/**
 * Real authors are proper names ("Свято-Покровська церква"); the model's
 * inventions ("архівець", "місцева влада") are lowercase generic words that
 * would match nothing and empty the results.
 */
const cleanAuthor = (value: unknown): string | undefined => {
  const text = cleanText(value);
  return text && /[A-ZЀ-Я]/.test(text) ? text : undefined;
};

/**
 * The place filter is a settlement name. When the query mentions a region or
 * archive the model tends to emit "Вінницька область" / "Вінницький край" /
 * "Полтавщина" instead, which match no settlement — drop those.
 */
// Adjectival endings come in -ська and -цька (Харківська, Вінницька).
const REGION_PATTERN = /([сц]ьк(а|ий|ої|е|ому)|област[ьі]|обл\.|край|щин[аи])(\s|$)/i;

const cleanPlace = (value: unknown): string | undefined => {
  const text = cleanText(value);
  return text && !REGION_PATTERN.test(text) ? text : undefined;
};

/**
 * Catalog codes are short alphanumerics with at least one digit — "127",
 * "Р-1234", "1а"; a digit-less value ("метричні книги") is the model filling a
 * field it shouldn't. Latin + the Cyrillic block (covers Ґ, Є, І, Ї); the
 * tsconfig target rules out `\p{L}`.
 */
const CODE_PATTERN = /^[A-Za-z0-9Ѐ-ӿ][A-Za-z0-9Ѐ-ӿ\-./]{0,19}$/;

const cleanCode = (value: unknown): string | undefined => {
  const text = cleanText(value);
  return text && CODE_PATTERN.test(text) && /\d/.test(text) ? text : undefined;
};

const cleanYear = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= MIN_YEAR && value <= CURRENT_YEAR ? value : undefined;

const cleanArchive = (value: unknown): string | undefined => {
  const text = cleanText(value);
  if (!text) {
    return undefined;
  }
  const needle = text.toLocaleLowerCase();
  return archiveCodes.find((code) => code.toLocaleLowerCase() === needle);
};

/** The schema asks for one tag; the search page takes an array, so wrap it. */
const cleanTags = (value: unknown): string[] | undefined =>
  typeof value === "string" && knownTags.has(value) ? [value] : undefined;

/** Lower-cased words of the query; the stem checks below are prefix matches against these. */
const queryWordsOf = (query: string): string[] =>
  query
    .toLocaleLowerCase()
    .split(/[^Ѐ-ӿa-z0-9'’-]+/)
    .filter(Boolean);

const STEM_LENGTH = 5;

/**
 * True when some word of `text` (3+ chars, cut to a 5-letter stem so inflections
 * still match: "Вінниці" ~ "Вінниця", "метричні" ~ "метрична") begins a word of
 * the query. Every free-text value the model returns must pass this: the query
 * is the only source of truth, and a value not traceable to it ("списки
 * священослужителів" for the query "шевченко") is an invention that would AND
 * itself into an empty result set — strictly worse than the plain title search.
 */
const appearsInQuery = (text: string, queryWords: string[]): boolean =>
  text
    .toLocaleLowerCase()
    .split(/[^Ѐ-ӿa-z0-9]+/)
    .filter((word) => word.length >= 3)
    .some((word) => {
      const stem = word.slice(0, STEM_LENGTH);
      return queryWords.some((queryWord) => queryWord.startsWith(stem));
    });

/** The only ways users ask for digitised records; `is_online` without one of these is invented. */
const ONLINE_PATTERN = /онлайн|скан|оцифр|цифров|online|digit/i;

/**
 * The model's output is treated as untrusted input: every field is re-validated
 * against the same rules the search page applies, and unknown values are dropped
 * rather than passed through. Returns null when nothing usable survived.
 */
export const sanitizeExtractedFilters = (raw: unknown, query = ""): SearchRequest | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const queryWords = queryWordsOf(query);
  // With no query to check against (direct calls) the traceability rules are off.
  const traceable = (text: string | undefined): string | undefined =>
    text && (!queryWords.length || appearsInQuery(text, queryWords)) ? text : undefined;

  let yearFrom = cleanYear(candidate.year_from);
  let yearTo = cleanYear(candidate.year_to);
  // Years can be derived ("1890-ті" → 1899) but never conjured: no digits in the query, no years.
  if (query && !/\d/.test(query)) {
    yearFrom = undefined;
    yearTo = undefined;
  }
  // A value sitting exactly on the allowed bounds is the model's way of saying
  // "no bound" for an open-ended range; the search API reads absence that way.
  if (yearFrom === MIN_YEAR) {
    yearFrom = undefined;
  }
  if (yearTo === CURRENT_YEAR) {
    yearTo = undefined;
  }
  if (yearFrom && yearTo && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  const detectedArchive = detectArchive(query);
  let place = traceable(cleanPlace(candidate.place));
  // "Харківський архів" → the model also emits place "Харків"; the query named
  // an archive, not a settlement.
  if (detectedArchive?.stem && place?.toLocaleLowerCase().startsWith(detectedArchive.stem)) {
    place = undefined;
  }

  const tags = cleanTags(candidate.tag)?.filter((tag) => traceable(tag));
  let title = traceable(cleanTitle(candidate.title));
  // A title equal to the tag only narrows the tag's own results.
  if (title && tags?.some((tag) => tag.toLocaleLowerCase() === title?.toLocaleLowerCase())) {
    title = undefined;
  }

  const filters: SearchRequest = {
    title,
    author: traceable(cleanAuthor(candidate.author)),
    place,
    year_from: yearFrom?.toString(),
    year_to: yearTo?.toString(),
    archive: detectedArchive?.code ?? cleanArchive(candidate.archive),
    fond: cleanCode(candidate.fond),
    inventory: cleanCode(candidate.inventory),
    file: cleanCode(candidate.file),
    tags: tags?.length ? tags : undefined,
    // The API treats any present value as truthy, so `false` must become "absent".
    is_online: candidate.is_online === true && (!query || ONLINE_PATTERN.test(query)) ? true : undefined,
  };

  const compact = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as SearchRequest;

  return Object.keys(compact).length ? compact : null;
};

/** Resolves to null as soon as `signal` aborts, even if `promise` never settles. */
const untilAborted = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T | null> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }
    signal?.addEventListener("abort", () => resolve(null), { once: true });
    promise.then(resolve, () => resolve(null));
  });

/**
 * Asks the on-device model to parse `input`. Resolves to null on any failure
 * (no model, still warming up past the deadline, aborted, unparsable answer) so
 * the caller can fall back to a title search without branching on error types.
 */
export const extractSearchFilters = async (input: string, signal?: AbortSignal): Promise<SearchRequest | null> => {
  const base = await untilAborted(warmUpPromptSession(), signal);
  if (!base) {
    return null;
  }

  // A clone starts from the system prompt only, so one query never colours the
  // next; the base session stays pristine for the page's lifetime. Every clone
  // is destroyed afterwards — leaked ones eat into the per-origin session budget.
  let clone: LanguageModelSession | undefined;
  try {
    if (base.clone) {
      try {
        clone = await base.clone({ signal });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          discardWarmSession(base);
        }
        return null;
      }
    }
    const response = await (clone ?? base).prompt(input, { responseConstraint: RESPONSE_SCHEMA, signal });
    return sanitizeExtractedFilters(JSON.parse(response), input);
  } catch {
    return null;
  } finally {
    clone?.destroy();
  }
};

/** The plain search the home page always offered, used whenever the model can't help. */
export const titleSearchFilters = (input: string): SearchRequest => ({ title: input });

/**
 * Serialises filters the way hooks/useSearch.tsx parses them (qs, indexed arrays),
 * so a home-page query lands on /search with every field pre-filled.
 */
export const buildSearchHref = (filters: SearchRequest): string => `/search?${qs.stringify(filters, { skipNulls: true })}`;
