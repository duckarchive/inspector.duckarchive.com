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
}>;

export type SearchResponse = Prisma.CaseGetPayload<{
  include: {
    descriptions: {
      include: { 
        fund: {
          include: {
            archive: true;
          }
        };
      }
    };
    authors: {
      include: {
        author: true;
      }
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
      fund,
      description,
      case: case_number, // 'case' is a reserved keyword
    }: SearchRequest = await request.json();

    // Build dynamic SQL query parts
    const whereParts: Prisma.Sql[] = [];

    // search allowed only by place or by geographical coordinates
    if (place) {
      whereParts.push(Prisma.sql`i.place ILIKE ${`%${place}%`}`);
    } else if (lng && lat) {
      const radiusValue = radius_m || 0;
      whereParts.push(Prisma.sql`
        ST_DWithin(
          ST_SetSRID(ST_MakePoint(i.lng, i.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${+lng}, ${+lat}), 4326)::geography,
          COALESCE(i.radius_m, 0) + ${+radiusValue}
        )
      `);
    }

    if (title) {
      whereParts.push(Prisma.sql`i.title ILIKE ${`%${title}%`}`);
    }

    if (author) {
      whereParts.push(Prisma.sql`i.author ILIKE ${`%${author}%`}`);
    }

    if (year) {
      whereParts.push(Prisma.sql`i.year = ${+year}`);
    }

    if (fund) {
      whereParts.push(Prisma.sql`i.fund = ${fund}`);
    }

    if (description) {
      whereParts.push(Prisma.sql`i.description = ${description}`);
    }

    if (case_number) {
      whereParts.push(Prisma.sql`i.case = ${case_number}`);
    }

    if (tags && tags.length > 0) {
      whereParts.push(Prisma.sql`i.tags && ARRAY[${Prisma.join(tags)}]::text[]`);
    }
    
    const bodyQuery = whereParts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
      : Prisma.sql``;

    const query = Prisma.sql`
      SELECT 
        i.*,
        a.id as archive_id,
        a.title as archive_title
      FROM "cases" i
      LEFT JOIN "archives" a ON i.archive_id = a.id
      ${bodyQuery}
      LIMIT 50
    `;

    const rawResults = await prisma.$queryRaw<
      {
        id: number;
        title: string;
        place: string;
        author: string;
        lng: number;
        lat: number;
        year: number;
        tags: string[];
        fund: string;
        description: string;
        case: string;
        archive_id: string;
        archive_title: string;
      }[]
    >(query);

    // // Transform the results to match the expected structure
    const items = rawResults.map((row) => ({
      id: row.id,
      title: row.title,
      place: row.place,
      author: row.author,
      lng: row.lng,
      lat: row.lat,
      year: row.year,
      tags: row.tags,
      fund: row.fund,
      description: row.description,
      case: row.case,
      archive_id: row.archive_id,
      archive: row.archive_id
        ? {
            id: row.archive_id,
            title: row.archive_title,
          }
        : null,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json({ error: "An error occurred while searching." }, { status: 500 });
  }
}
