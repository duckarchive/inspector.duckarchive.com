import { Archive, Case, Description, Fund, Match } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ErrorResponse } from "@/types";

export type SearchRequest = Partial<{
  a: string;
  f: string;
  d: string;
  c: string;
  isStrict: boolean;
}>;

export type SearchResponse =
  | {
      id: Match["id"];
      archive_code: Archive["code"];
      fund_code: Fund["code"];
      description_code: Description["code"];
      case_code: Case["code"];
      url: Match["url"];
    }[]
 ;

export async function POST(req: NextRequest): Promise<NextResponse<SearchResponse | ErrorResponse>> {
  const { a, f, d, c, isStrict }: SearchRequest = await req.json();

  const _a = a || "%"; // case sensitive
  const _f = isStrict ? f || "%" : `${f || ""}%`;
  const _d = isStrict ? d || "%" : `${d || ""}%`;
  const _c = isStrict ? c || "%" : `${c || ""}%`;
  const rest = `${_f}-${_d}-${_c}`.toUpperCase();
  const full_code = `${_a}-${rest}`;
  const matches: Match[] = await prisma.$queryRaw`
      select * from matches
      where full_code like ${full_code}
      limit 20
    `;

  const searchResults = matches
    .map((match) => {
      if (!match.full_code) {
        return null;
      }
      const [archive_code, fund_code, description_code, case_code] = match.full_code.split("-");

      return {
        id: match.id,
        archive_code,
        fund_code,
        description_code,
        case_code,
        url: match.url,
      };
    })
    .filter((match) => match) as SearchResponse;

  if (searchResults) {
    return NextResponse.json(searchResults);
  } else {
    return NextResponse.json(
      {
        message: "No matches found",
      },
      { status: 404 },
    );
  }
}
