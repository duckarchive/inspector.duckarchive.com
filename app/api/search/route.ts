import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";

export type SearchRequest = Partial<{
  lat: string;
  lng: string;
  radius_m: number;
  year: string;
  title: string;
  place: string;
  author: string;
  tags: string[];
  archive: string;
  fund: string;
  description: string;
  case: string;
  is_online: boolean;
}>;

export type SearchResponse = Prisma.CaseGetPayload<{
  include: {
    descriptions: {
      include: {
        fund: {
          include: {
            archive: true;
          };
        };
      };
    };
    authors: {
      include: {
        author: true;
      };
    };
    locations: true;
    years: true;
  };
}>[];

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
      tags,
      archive,
      fund,
      description,
      case: case_number, // 'case' is a reserved keyword
      is_online = true,
    }: SearchRequest = await request.json();

    // Build dynamic SQL query parts
    const whereParts: Prisma.Sql[] = [];

    // search allowed only by place or by geographical coordinates
    if (place) {
      whereParts.push(Prisma.sql`c.info ILIKE ${`%${place}%`}`);
    } else if (lng && lat) {
      const radiusValue = radius_m || 0;
      whereParts.push(Prisma.sql`
        ST_DWithin(
          ST_SetSRID(ST_MakePoint(cl.lng, cl.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${+lng}, ${+lat}), 4326)::geography,
          COALESCE(cl.radius_m, 0) + ${+radiusValue}
        )
      `);
    }

    if (title) {
      whereParts.push(Prisma.sql`c.title ILIKE ${`%${title}%`}`);
    }

    if (author) {
      whereParts.push(Prisma.sql`au.title ILIKE ${`%${author}%`}`);
    }

    if (year) {
      whereParts.push(Prisma.sql`${+year} BETWEEN cy.start_year AND cy.end_year`);
    }

    if (archive || fund || description || case_number) {
      const isStrict = true; // TODO: make it configurable
      const _a = archive || "%"; // case sensitive
      const _f = isStrict ? fund || "%" : `${fund || ""}%`;
      const _d = isStrict ? description || "%" : `${description || ""}%`;
      const _c = isStrict ? case_number || "%" : `${case_number || ""}%`;
      const rest = `${_f}-${_d}-${_c}`.toUpperCase();
      const full_code = `${_a}-${rest}`;
      whereParts.push(Prisma.sql`c.full_code LIKE ${full_code}`);
    }

    if (tags && tags.length > 0) {
      whereParts.push(Prisma.sql`c.tags && ARRAY[${Prisma.join(tags)}]::text[]`);
    }

    if (is_online) {
      whereParts.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "case_online_copies" m
        WHERE m.case_id = c.id AND m.url IS NOT NULL
      )`);
    }

    const bodyQuery = whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``;

    const query = Prisma.sql`
      SELECT 
        c.*,
        -- years
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'case_id', cy.case_id,
              'start_year', cy.start_year,
              'end_year', cy.end_year
            )
          ) FILTER (WHERE cy.case_id IS NOT NULL),
          '[]'
        ) AS years

      FROM "cases" c
      LEFT JOIN "descriptions" d ON c.description_id = d.id
      LEFT JOIN "funds" f ON d.fund_id = f.id
      LEFT JOIN "archives" a ON f.archive_id = a.id
      LEFT JOIN "case_authors" ca ON c.id = ca.case_id
      LEFT JOIN "authors" au ON ca.author_id = au.id
      LEFT JOIN "case_locations" cl ON c.id = cl.case_id
      LEFT JOIN "case_years" cy ON c.id = cy.case_id

      ${bodyQuery}

      GROUP BY c.id
      LIMIT 50
    `;

    const rawResults = await prisma.$queryRaw<SearchResponse>(query);

    return NextResponse.json(rawResults);
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json({ error: "An error occurred while searching." }, { status: 500 });
  }
}
