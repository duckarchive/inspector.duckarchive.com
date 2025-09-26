import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetDescriptionResponse =
  | Prisma.DescriptionGetPayload<{
      include: {
        years: true;
        matches: {
          select: {
            url: true;
          };
        };
        cases: {
          select: {
            id: true;
            code: true;
            title: true;
            years: true;
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

interface GetDescriptionParams {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
  }>;
}

export async function GET(
  req: NextRequest,
  props: GetDescriptionParams,
): Promise<NextResponse<GetDescriptionResponse | ErrorResponse>> {
  const params = await props.params;
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0");

  if (!archiveCode || !fundCode || !descriptionCode) {
    return NextResponse.json(
      { message: '"archive-code", "fund-code" and "description-code" params are required' },
      { status: 400 },
    );
  }

  const description = await prisma.description.findFirst({
    where: {
      fund: {
        code: fundCode,
        archive: {
          code: archiveCode,
        },
      },
      code: descriptionCode,
    },
    include: {
      years: true,
      matches: {
        where: {
          case_id: null,
        },
        select: {
          url: true
        },
      }
    }
  });

  if (!description) {
    return NextResponse.json({ message: "Description not found" }, { status: 404 });
  }

  const cases = await prisma.case.findMany({
    where: {
      description_id: description.id,
    },
    select: {
      id: true,
      code: true,
      title: true,
      years: true,
      matches: {
        select: {
          updated_at: true,
          children_count: true,
          resource_id: true,
        },
      },
    },
    skip: page * 5000,
    take: 5000,
  });

  return NextResponse.json(
    {
      ...description,
      cases,
    },
    { status: 200 },
  );
}
