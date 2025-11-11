import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetDescriptionResponse = Prisma.DescriptionGetPayload<{
  include: {
    years: true;
    online_copies: true;
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
}>;

export const getDescriptionByCode = async (
  archiveCode: string,
  fundCode: string,
  descriptionCode: string,
  page: number = 0
): Promise<GetDescriptionResponse | null> => {
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
      online_copies: true,
    },
  });

  if (!description) {
    return null;
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

  return { ...description, cases };
};

interface GetDescriptionParams {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
  }>;
}

export async function GET(
  req: NextRequest,
  props: GetDescriptionParams
): Promise<NextResponse<GetDescriptionResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fundCode = params["fund-code"];
    const descriptionCode = params["description-code"];
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0");

    if (!archiveCode || !fundCode || !descriptionCode) {
      return NextResponse.json(
        { message: '"archive-code", "fund-code" and "description-code" params are required' },
        { status: 400 }
      );
    }

    const description = await getDescriptionByCode(archiveCode, fundCode, descriptionCode, page);

    if (!description) {
      return NextResponse.json({ message: "Description not found" }, { status: 404 });
    }

    return NextResponse.json(description, { status: 200 });
  } catch (error) {
    console.error("Error fetching description:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
