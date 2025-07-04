import { Match, Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type CheckOnlineRequest = Partial<{
  full_codes: string[];
}>;

export type CheckOnlineResponse = boolean[];

export async function POST(req: NextRequest): Promise<NextResponse<CheckOnlineResponse | ErrorResponse>> {
  const isAuth = await isAuthorized();
  if (!isAuth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { full_codes }: CheckOnlineRequest = await req.json();
  if (!full_codes || !full_codes.length) {
    return NextResponse.json({ message: '"full_codes" is required' }, { status: 400 });
  }
  if (full_codes.length > 100) {
    return NextResponse.json({ message: '"full_codes" length should be less than 100' }, { status: 400 });
  }
  const matches: Match[] = await prisma.$queryRaw`
      select full_code from matches
      where full_code in (${Prisma.join(full_codes)}) and children_count > 0
    `;

  const matchesHash: Record<string, boolean> = {};

  matches.forEach((match) => {
    matchesHash[match.full_code || ""] = true;
  });

  const searchResults = full_codes.map((fc) => {
    if (matchesHash[fc]) {
      return true;
    }
    return false;
  });

  if (searchResults) {
    return NextResponse.json(searchResults);
  } else {
    return NextResponse.json({ message: "No matches found" }, { status: 404 });
  }
}
