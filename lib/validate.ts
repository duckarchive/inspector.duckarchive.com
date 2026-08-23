import { z } from "zod";

/**
 * Public API input rules.
 *
 * Every free-text value the public API accepts is catalog data in Ukrainian
 * (or pre-1917 Russian): archive/fond/inventory/file codes, titles, places,
 * author names, tags. None of it legitimately contains Latin letters, so a
 * Latin letter anywhere in a value is rejected outright — it is never a valid
 * query and it closes the door on anything that looks like SQL, JS or a path
 * (`SELECT`, `<script`, `../`, `http`) before the value reaches the database.
 * Parameterised queries already make injection impossible; this is the belt
 * to those braces, and it keeps garbage out of the trigram indexes.
 */
export const LATIN_LETTER = /[A-Za-z]/;

const noLatin = (field: string) =>
  z
    .string()
    .max(200, { message: `"${field}" is too long (max 200 characters)` })
    .refine((v) => !LATIN_LETTER.test(v), { message: `"${field}" must not contain Latin letters` });

const optionalText = (field: string) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), noLatin(field).optional());

/** "1850" — years arrive as strings from query params. */
const optionalYear = (field: string) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : typeof v === "number" ? String(v) : v),
    z
      .string()
      .regex(/^\d{3,4}$/, { message: `"${field}" must be a year` })
      .optional(),
  );

/** "48.45" — coordinates arrive as strings too. */
const optionalNumberString = (field: string) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : typeof v === "number" ? String(v) : v),
    z
      .string()
      .regex(/^-?\d+(\.\d+)?$/, { message: `"${field}" must be a number` })
      .optional(),
  );

export const searchRequestSchema = z
  .object({
    title: optionalText("title"),
    place: optionalText("place"),
    author: optionalText("author"),
    archive: optionalText("archive"),
    fond: optionalText("fond"),
    inventory: optionalText("inventory"),
    file: optionalText("file"),
    lat: optionalNumberString("lat"),
    lng: optionalNumberString("lng"),
    radius_m: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().min(0).max(500_000).optional(),
    ),
    year_from: optionalYear("year_from"),
    year_to: optionalYear("year_to"),
    tags: z.preprocess((v) => (v === null ? undefined : v), z.array(noLatin("tags")).max(20).optional()),
    is_online: z.preprocess((v) => (v === null ? undefined : v), z.boolean().optional()),
    /**
     * Trigram word-similarity threshold for the text fields (title, place,
     * author): 1 = (almost) exact words, 0.3 = very loose. Absent or 0 =
     * plain substring match.
     */
    fuzziness: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().min(0).max(1).optional(),
    ),
  })
  .strict();

export type ValidatedSearchRequest = z.infer<typeof searchRequestSchema>;

/** Catalog path segment: codes like `ЦДІАК`, `Р6478`, `10А`, `1-2`. */
export const CATALOG_CODE = /^[^A-Za-z]{1,40}$/;

export const isCatalogCode = (value: string | undefined): value is string =>
  typeof value === "string" && CATALOG_CODE.test(value);

/** First human-readable problem of a failed parse. */
export const firstIssue = (error: z.ZodError): string => {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  if (issue.code === "unrecognized_keys") return `unknown field(s): ${issue.keys.join(", ")}`;
  return `${issue.path.length ? issue.path.join(".") + ": " : ""}${issue.message}`;
};

/** `%` and `_` are LIKE wildcards — a user typing them must get a literal match. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);
