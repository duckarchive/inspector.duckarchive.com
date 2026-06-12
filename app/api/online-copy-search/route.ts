import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma, Availability } from "@generated/prisma/client/client";

export type OnlineCopySearchRequest = {
  q: string;
};

export type OnlineCopySearchResponse = {
  parsed: string;
  url: string;
  availability: Availability | null;
}[];

const MAX_QUERY_LENGTH = 200;
const MIN_LITERAL_CHARS = 3;

// user wildcards: "*" = many chars, "_" = single char; literal "%" and "\" are
// escaped so the only way to widen a match is through the documented wildcards
const toLikePattern = (q: string): string => q.replace(/[\\%*]/g, (ch) => (ch === "*" ? "%" : `\\${ch}`));

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const q = typeof body?.q === "string" ? body.q.trim() : "";

    if (!q) {
      return NextResponse.json({ message: "Query is required." }, { status: 400 });
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ message: `Query is limited to ${MAX_QUERY_LENGTH} characters.` }, { status: 400 });
    }

    if (q.replace(/[*_]/g, "").length < MIN_LITERAL_CHARS) {
      return NextResponse.json(
        { message: `Query must contain at least ${MIN_LITERAL_CHARS} non-wildcard characters.` },
        { status: 400 },
      );
    }

    const pattern = toLikePattern(q);

    const results = await prisma.$queryRaw<OnlineCopySearchResponse>(Prisma.sql`
      SELECT parsed, url, availability
      FROM "file_online_copies"
      WHERE parsed ILIKE ${pattern}
      ORDER BY parsed ASC
      LIMIT 100
    `);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Online Copy Search API Error:", error);

    return NextResponse.json({ message: "An error occurred while searching." }, { status: 500 });
  }
}
