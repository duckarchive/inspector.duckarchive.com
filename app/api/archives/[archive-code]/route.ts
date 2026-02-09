import { Prisma } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getArchiveByCode } from "@/app/api/archives/[archive-code]/data";

export type GetArchiveResponse = Prisma.ArchiveGetPayload<{
  include: {
    funds: {
      select: {
        id: true;
        code: true;
        title: true;
        years: true;
      };
    };
  };
}>;

interface GetArchiveParams {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function GET(
  _req: NextRequest,
  props: GetArchiveParams,
): Promise<NextResponse<GetArchiveResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];

    if (!archiveCode) {
      return NextResponse.json({ message: '"archive-code" query param is required' }, { status: 400 });
    }

    const archive = await getArchiveByCode(archiveCode);

    if (archive) {
      return NextResponse.json(archive, { status: 200 });
    } else {
      return NextResponse.json({ message: "Archive not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching archive:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
