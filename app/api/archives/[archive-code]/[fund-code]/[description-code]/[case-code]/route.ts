import { Case, Match } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetCaseResponse = {
  title: Case["title"];
  matches: Match[];
};

interface GetCaseParams {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
    "case-code": string;
  }>;
}

export async function GET(
  _req: NextRequest,
  props: GetCaseParams,
): Promise<NextResponse<GetCaseResponse | ErrorResponse>> {
  const params = await props.params;
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const caseCode = params["case-code"];

  if (!archiveCode || !fundCode || !descriptionCode || !caseCode) {
    return NextResponse.json(
      { message: '"archive-code", "fund-code", "description-code" and "case-code" params are required' },
      { status: 400 },
    );
  }

  const caseItem = await prisma.case.findFirst({
    where: {
      description: {
        code: descriptionCode,
        fund: {
          code: fundCode,
          archive: {
            code: archiveCode,
          },
        },
      },
      code: caseCode,
    },
  });

  if (caseItem) {
    const matches = await prisma.match.findMany({
      where: {
        case_id: caseItem.id,
        children_count: {
          gt: 0,
        },
      },
    });
    return NextResponse.json({
      title: caseItem.title,
      matches,
    });
  } else {
    return NextResponse.json({ message: "Case not found" }, { status: 404 });
  }
}
