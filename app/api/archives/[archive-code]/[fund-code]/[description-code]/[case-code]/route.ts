import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetCaseResponse = Prisma.CaseGetPayload<{
  include: {
    years: true;
    matches: true;
    locations: {
      select: {
        id: true,
        lat: true,
        lng: true,
        radius_m: true
      },
    }
  };
}>

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
      full_code: `${archiveCode}-${fundCode}-${descriptionCode}-${caseCode}`,
    },
    include: {
      years: true,
      locations: {
        select: {
          id: true,
          lat: true,
          lng: true,
          radius_m: true
        },
      },
      matches: {
        where: {
          children_count: {
            gt: 0,
          },
        },
      },
    },
  });

  if (caseItem) {
    return NextResponse.json(caseItem);
  } else {
    return NextResponse.json({ message: "Case not found" }, { status: 404 });
  }
}
