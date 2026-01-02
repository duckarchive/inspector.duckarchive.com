import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getCaseByCode } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/data";

export type GetCaseResponse = Prisma.CaseGetPayload<{
  include: {
    years: true;
    online_copies: true;
    authors: {
      include: {
        author: true;
      };
    };
    locations: {
      select: {
        id: true;
        lat: true;
        lng: true;
        radius_m: true;
      };
    };
  };
}>;

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
  props: GetCaseParams
): Promise<NextResponse<GetCaseResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fundCode = params["fund-code"];
    const descriptionCode = params["description-code"];
    const caseCode = params["case-code"];

    if (!archiveCode || !fundCode || !descriptionCode || !caseCode) {
      return NextResponse.json(
        { message: '"archive-code", "fund-code", "description-code" and "case-code" params are required' },
        { status: 400 }
      );
    }

    const caseItem = await getCaseByCode(archiveCode, fundCode, descriptionCode, caseCode);

    if (caseItem) {
      return NextResponse.json(caseItem);
    } else {
      return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
