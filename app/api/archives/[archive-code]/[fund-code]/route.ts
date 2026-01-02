import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getFundByCode } from "@/app/api/archives/[archive-code]/[fund-code]/data";

export type GetFundResponse = Prisma.FundGetPayload<{
  include: {
    years: true;
    descriptions: {
      select: {
        id: true;
        code: true;
        title: true;
        years: true;
      };
    };
  };
}>;

interface GetFundParams {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
  }>;
}

export async function GET(
  _req: NextRequest,
  props: GetFundParams
): Promise<NextResponse<GetFundResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fundCode = params["fund-code"];

    if (!archiveCode || !fundCode) {
      return NextResponse.json({ message: '"archive-code" and "fund-code" params are required' }, { status: 400 });
    }

    const fund = await getFundByCode(archiveCode, fundCode);

    if (fund) {
      return NextResponse.json(fund, { status: 200 });
    } else {
      return NextResponse.json({ message: "Fund not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching fund:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
