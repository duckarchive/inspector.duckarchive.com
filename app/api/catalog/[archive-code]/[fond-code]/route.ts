import { Prisma } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getFondByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/data";

export type GetFondResponse = Prisma.FondGetPayload<{
  include: {
    years: true;
    inventories: {
      select: {
        id: true;
        code: true;
        title: true;
        years: true;
      };
    };
  };
}>;

interface GetFondParams {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
  }>;
}

export async function GET(
  _req: NextRequest,
  props: GetFondParams,
): Promise<NextResponse<GetFondResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fondCode = params["fond-code"];

    if (!archiveCode || !fondCode) {
      return NextResponse.json({ message: '"archive-code" and "fond-code" params are required' }, { status: 400 });
    }

    const fond = await getFondByCode(archiveCode, fondCode);

    if (fond) {
      return NextResponse.json(fond, { status: 200 });
    } else {
      return NextResponse.json({ message: "Fond not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching fond:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
