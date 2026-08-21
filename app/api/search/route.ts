import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export type SearchRequest = Partial<{
  lat: string;
  lng: string;
  radius_m: number;
  year_from: string;
  year_to: string;
  /** @deprecated single year — still honoured for existing links and API callers. */
  year: string;
  title: string;
  place: string;
  author: string;
  tags: string[];
  archive: string;
  fond: string;
  inventory: string;
  file: string;
  is_online: boolean;
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
    const {
      title,
      place,
      author,
      lng,
      lat,
      radius_m,
      year,
      year_from,
      year_to,
      tags,
      archive,
      fond,
      inventory,
      file,
      is_online,
    }: SearchRequest = await request.json();

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
      const pattern = `%${place}%`;

      ctes.push(Prisma.sql`place_files AS (
        SELECT id AS file_id
        FROM "files"
        WHERE info ILIKE ${pattern}
        UNION
        SELECT fa.file_id
        FROM "authors" a
        JOIN "file_authors" fa ON fa.author_id = a.id
        WHERE a.title ILIKE ${pattern}
      )`);
      whereParts.push(Prisma.sql`f.id IN (SELECT file_id FROM place_files)`);
    } else if (lat && lng && isFiniteNumber(lat) && isFiniteNumber(lng)) {
      const radiusValue = Number(radius_m) || 0;
      const target = Prisma.sql`ST_SetSRID(ST_MakePoint(${+lng}, ${+lat}), 4326)::geography`;

      // A file matches through its own coordinates or through those of any author
      // (church/parish) it is attributed to — authors carry the geocoded locations.
      // Only file_locations has its own radius; an author is a bare point.
      ctes.push(Prisma.sql`geo_files AS (
        SELECT l.file_id
        FROM "file_locations" l
        WHERE ST_DWithin(
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
      whereParts.push(Prisma.sql`f.title ILIKE ${`%${title}%`}`);
    }

    if (author) {
      whereParts.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "file_authors" fa
        JOIN "authors" a ON a.id = fa.author_id
        WHERE fa.file_id = f.id AND a.title ILIKE ${`%${author}%`}
      )`);
    }

    // A file matches when its own [start_year, end_year] overlaps the requested
    // window. With a single `year` (or from === to) that is the old "year falls
    // inside the file's range" test; an open end leaves that side unbounded.
    const yearFrom = year_from || year;
    const yearTo = year_to || year;
    if (yearFrom && yearTo) {
      whereParts.push(Prisma.sql`fy.start_year <= ${+yearTo} AND fy.end_year >= ${+yearFrom}`);
    } else if (yearFrom) {
      whereParts.push(Prisma.sql`fy.end_year >= ${+yearFrom}`);
    } else if (yearTo) {
      whereParts.push(Prisma.sql`fy.start_year <= ${+yearTo}`);
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

    const rawResults = await prisma.$queryRaw<SearchResponse>(query);

    return NextResponse.json(rawResults);
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json({ error: "An error occurred while searching." }, { status: 500 });
  }
}
