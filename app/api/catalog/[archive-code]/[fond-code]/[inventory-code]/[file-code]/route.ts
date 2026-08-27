import { Prisma } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { isCatalogCode } from "@/lib/validate";
import { getFileByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/data";

export type GetFileResponse = Prisma.FileGetPayload<{
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
    inventory: {
      select: {
        fond_id: true;
      };
    };
  };
}>;

interface GetFileParams {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
    "inventory-code": string;
    "file-code": string;
  }>;
}

export async function GET(
  _req: NextRequest,
  props: GetFileParams,
): Promise<NextResponse<GetFileResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fondCode = params["fond-code"];
    const inventoryCode = params["inventory-code"];
    const fileCode = params["file-code"];
    // catalog codes are Cyrillic/digits — a Latin letter is never a valid code (and never reaches the DB)
    if (!isCatalogCode(archiveCode) || !isCatalogCode(fondCode) || !isCatalogCode(inventoryCode) || !isCatalogCode(fileCode)) {
      return NextResponse.json({ message: "invalid catalog code" }, { status: 400 });
    }

    if (!archiveCode || !fondCode || !inventoryCode || !fileCode) {
      return NextResponse.json(
        { message: '"archive-code", "fond-code", "inventory-code" and "file-code" params are required' },
        { status: 400 },
      );
    }

    const file = await getFileByCode(archiveCode, fondCode, inventoryCode, fileCode);

    if (file) {
      return NextResponse.json(file);
    } else {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
