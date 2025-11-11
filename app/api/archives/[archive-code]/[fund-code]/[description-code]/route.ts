import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getDescriptionByCode } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/data";

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
