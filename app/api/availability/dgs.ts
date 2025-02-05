import { Match } from "@prisma/client";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export type CheckDGSRequest = Partial<{
  dgs: string;
}>;

export type CheckDGSResponse = boolean | ErrorResponse;

export async function POST(req: NextRequest): Promise<NextResponse<CheckDGSResponse>> {
  const user = await authorizeGoogle(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { dgs }: CheckDGSRequest = await req.json();
  if (!dgs) {
    return NextResponse.json({ message: '"dgs" is required' }, { status: 400 });
  }
  const dgsMatch: Match | null = await prisma.match.findFirst({
    where: {
      api_params: `dgs:${dgs}`,
      case_id: {
        not: null,
      },
    },
  });

  if (dgsMatch) {
    return NextResponse.json(true);
  } else {
    return NextResponse.json({ message: "No dgs matches found" }, { status: 404 });
  }
}
