import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetFundResponse =
  | Prisma.FundGetPayload<{
      include: {
        descriptions: {
          select: {
            id: true;
            code: true;
            title: true;
            matches: {
              select: {
                updated_at: true;
                children_count: true;
                resource_id: true;
              };
            };
          };
        };
      };
    }>
 ;

interface GetFundParams {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
  }>;
}

export async function GET(_req: NextRequest, props: GetFundParams): Promise<NextResponse<GetFundResponse | ErrorResponse>> {
  const params = await props.params;
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];

  if (!archiveCode || !fundCode) {
    return NextResponse.json({ message: '"archive-code" and "fund-code" params are required' }, { status: 400 });
  }

  const fund = await prisma.fund.findFirst({
    where: {
      archive: {
        code: archiveCode,
      },
      code: fundCode,
    },
    include: {
      descriptions: {
        select: {
          id: true,
          code: true,
          title: true,
          matches: {
            where: {
              case_id: null,
            },
            select: {
              updated_at: true,
              children_count: true,
              resource_id: true,
            },
          },
        },
      },
    },
  });
  if (fund) {
    return NextResponse.json(fund, { status: 200 });
  } else {
    return NextResponse.json({ message: "Fund not found" }, { status: 404 });
  }
}
