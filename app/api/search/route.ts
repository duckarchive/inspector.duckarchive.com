import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { escapeLike, firstIssue, searchRequestSchema } from "@/lib/validate";

export type SearchRequest = Partial<{
  lat: string;
  lng: string;
  radius_m: number;
  year_from: string;
  year_to: string;
  title: string;
  place: string;
  author: string;
  tags: string[];
  archive: string;
  fond: string;
  inventory: string;
  file: string;
  is_online: boolean;
  /**
   * Fuzzy matching for the text fields (title, place, author) — a trigram
   * word-similarity threshold, 1 = exact words … 0.3 = very loose (floor). Absent
   * or 0 = plain substring match.
   */
  fuzziness: number;
}>;

export type SearchResponse = {
  id: string;
  code: string;
  updated_at: string;
  title: string;
  info: string | null;
  inventory_id: string;
  /** legacy alias of `inventory_id`, kept for existing API consumers */
  description_id: string;
  full_code: string;
  tags: string[];
  is_online: boolean;
  years: Array<{
    file_id: string;
    /** legacy alias of `file_id` */
    case_id: string;
    start_year: number;
    end_year: number;
  }>;
}[];

const isFiniteNumber = (value: string) => value.trim() !== "" && Number.isFinite(Number(value));

export async function POST(request: Request) {
  try {
    const parsed = searchRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: firstIssue(parsed.error) }, { status: 400 });
    }
    const { title, place, author, lng, lat, radius_m, year_from, year_to, tags, archive, fond, inventory, file, is_online } =
      parsed.data;
    const fuzziness = parsed.data.fuzziness && parsed.data.fuzziness > 0 ? Math.max(0.3, parsed.data.fuzziness) : 0;
    /**
     * Text predicate on one column: substring (ILIKE, `%` and `_` escaped) or,
     * in fuzzy mode, trigram word similarity — `needle <% column` is served by
     * the GIN trgm indexes on files.title / files.info / authors.title and
     * honours pg_trgm.word_similarity_threshold, which is set per request below.
     */
    const textMatch = (column: Prisma.Sql, needle: string) =>
      fuzziness ? Prisma.sql`${needle} <% ${column}` : Prisma.sql`${column} ILIKE ${`%${escapeLike(needle)}%`}`;

    const hasOnlineCopy = Prisma.sql`EXISTS (
      SELECT 1
      FROM "online_copies" m
      WHERE m.file_id = f.id AND m.url IS NOT NULL AND m.availability = 'PUBLIC'
    )`;

    // Build dynamic SQL query parts
    const ctes: Prisma.Sql[] = [];
    const whereParts: Prisma.Sql[] = [];

    // Location narrowing runs in a CTE rather than a join predicate: it lets the
    // planner start from the ~11k authors / file_locations rows and reach `files`
    // by id, instead of scanning 3.3M files. Search is allowed either by place
    // name or by geographical coordinates, never both.
    if (place) {

      ctes.push(Prisma.sql`place_files AS (
        SELECT id AS file_id
        FROM "files"
        WHERE ${textMatch(Prisma.sql`info`, place)}
        UNION
        SELECT fa.file_id
        FROM "authors" a
        JOIN "file_authors" fa ON fa.author_id = a.id
        WHERE ${textMatch(Prisma.sql`a.title`, place)}
      )`);
      whereParts.push(Prisma.sql`f.id IN (SELECT file_id FROM place_files)`);
    } else if (lat && lng && isFiniteNumber(lat) && isFiniteNumber(lng)) {
      const radiusValue = Number(radius_m) || 0;
      const target = Prisma.sql`ST_SetSRID(ST_MakePoint(${+lng}, ${+lat}), 4326)::geography`;

      // A file matches through its own coordinates or through those of any author
      // (church/parish) it is attributed to — authors carry the geocoded locations.
      // Only file_locations has its own radius; an author is a bare point.
      //
      // Both ST_DWithin calls are served by GiST indexes on the exact expression
      // ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography (file_locations_geog_idx,
      // authors_geog_idx) — keep the expression text identical. A per-row distance
      // (radius_m + r) can't use the index, so file_locations is first narrowed with
      // a constant upper bound (r + max radius_m) and then checked exactly.
      ctes.push(Prisma.sql`geo_files AS (
        SELECT l.file_id
        FROM "file_locations" l
        WHERE ST_DWithin(
          ST_SetSRID(ST_MakePoint(l.lng, l.lat), 4326)::geography,
          ${target},
          ${radiusValue} + (SELECT COALESCE(MAX(radius_m), 0) FROM "file_locations")
        )
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(l.lng, l.lat), 4326)::geography,
          ${target},
          COALESCE(l.radius_m, 0) + ${radiusValue}
        )
        UNION
        SELECT fa.file_id
        FROM "authors" a
        JOIN "file_authors" fa ON fa.author_id = a.id
        WHERE a.lat IS NOT NULL
          AND a.lng IS NOT NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(a.lng, a.lat), 4326)::geography,
            ${target},
            ${radiusValue}
          )
      )`);
      whereParts.push(Prisma.sql`f.id IN (SELECT file_id FROM geo_files)`);
    }

    if (title) {
      // "title" is the free-text box: it looks at the file's own title and
      // info and at the name/info of every author (church, parish) linked to
      // it, so a church or place written only in the author record still hits.
      // One UNION CTE (like place_files) rather than `… OR f.id IN (subquery)`
      // in the WHERE: the OR form made the planner abandon the trigram bitmap
      // scans and walk all 3.3M files (20–80 s per query); this shape keeps every
      // arm on its index and reaches `files` by id.
      ctes.push(Prisma.sql`title_files AS (
        SELECT id AS file_id
        FROM "files"
        WHERE ${textMatch(Prisma.sql`title`, title)} OR ${textMatch(Prisma.sql`info`, title)}
        UNION
        SELECT fa.file_id
        FROM "authors" a
        JOIN "file_authors" fa ON fa.author_id = a.id
        WHERE ${textMatch(Prisma.sql`a.title`, title)} OR ${textMatch(Prisma.sql`a.info`, title)}
      )`);
      whereParts.push(Prisma.sql`f.id IN (SELECT file_id FROM title_files)`);
    }

    if (author) {
      whereParts.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "file_authors" fa
        JOIN "authors" a ON a.id = fa.author_id
        WHERE fa.file_id = f.id AND ${textMatch(Prisma.sql`a.title`, author)}
      )`);
    }

    // A file matches when its own [start_year, end_year] overlaps the requested
    // window (from === to is the "year falls inside the file's range" test); an
    // open end leaves that side unbounded.
    if (year_from && year_to) {
      whereParts.push(Prisma.sql`fy.start_year <= ${+year_to} AND fy.end_year >= ${+year_from}`);
    } else if (year_from) {
      whereParts.push(Prisma.sql`fy.end_year >= ${+year_from}`);
    } else if (year_to) {
      whereParts.push(Prisma.sql`fy.start_year <= ${+year_to}`);
    }

    if (archive || fond || inventory || file) {
      const isStrict = true; // TODO: make it configurable
      const _a = archive || "%"; // case sensitive
      const _f = isStrict ? fond || "%" : `${fond || ""}%`;
      const _i = isStrict ? inventory || "%" : `${inventory || ""}%`;
      const _fl = isStrict ? file || "%" : `${file || ""}%`;
      const rest = `${_f}-${_i}-${_fl}`.toUpperCase();
      const full_code = `${_a}-${rest}`;
      whereParts.push(Prisma.sql`f.full_code LIKE ${full_code}`);
    }

    if (tags && tags.length > 0) {
      // A tag matches through the file itself or through any linked author
      // (confession tags live on authors, record-type tags on files). One CTE
      // per tag keeps the file arm on the tags GIN index and lets the author
      // arm start from the ~11k authors; the per-tag sets are then intersected.
      tags.forEach((tag, i) => {
        const cteName = Prisma.raw(`tag_files_${i}`);
        ctes.push(Prisma.sql`${cteName} AS (
          SELECT id AS file_id
          FROM "files"
          WHERE tags @> ARRAY[${tag}]::text[]
          UNION
          SELECT fa.file_id
          FROM "authors" a
          JOIN "file_authors" fa ON fa.author_id = a.id
          WHERE a.tags @> ARRAY[${tag}]::text[]
        )`);
        whereParts.push(Prisma.sql`f.id IN (SELECT file_id FROM ${cteName})`);
      });
    }

    if (is_online) {
      whereParts.push(hasOnlineCopy);
    }

    if (whereParts.length === 0) {
      return NextResponse.json({ message: "at least one search criterion is required" }, { status: 400 });
    }

    const withQuery = ctes.length > 0 ? Prisma.sql`WITH ${Prisma.join(ctes, ", ")}` : Prisma.sql``;
    const bodyQuery = whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``;

    const query = Prisma.sql`
      ${withQuery}
      SELECT
        f.*,
        f.inventory_id AS description_id,
        ${hasOnlineCopy} AS is_online,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'file_id', fy.file_id,
              'case_id', fy.file_id,
              'start_year', fy.start_year,
              'end_year', fy.end_year
            )
          ) FILTER (WHERE fy.file_id IS NOT NULL),
          '[]'
        ) AS years

      FROM "files" f
      LEFT JOIN "file_years" fy ON f.id = fy.file_id

      ${bodyQuery}

      GROUP BY f.id
      ORDER BY f.full_code ASC
      LIMIT 50
    `;

    // The similarity threshold is a session GUC, so it must travel on the same
    // connection as the query: SET LOCAL inside one transaction. The value is a
    // validated number (0.3–1), never user text, hence the unsafe variant.
    const rawResults = fuzziness
      ? await prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL pg_trgm.word_similarity_threshold = ${fuzziness.toFixed(2)}`);
            return tx.$queryRaw<SearchResponse>(query);
          },
          { timeout: 20_000 },
        )
      : await prisma.$queryRaw<SearchResponse>(query);

    return NextResponse.json(rawResults);
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json({ error: "An error occurred while searching." }, { status: 500 });
  }
}
