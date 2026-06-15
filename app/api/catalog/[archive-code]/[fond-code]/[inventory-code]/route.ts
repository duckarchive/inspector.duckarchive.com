import { Prisma } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getInventoryByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/data";

export type GetInventoryResponse = Prisma.InventoryGetPayload<{
  include: {
    years: true;
    online_copies: true;
    files: {
      select: {
        id: true;
        code: true;
        title: true;
        years: true;
      };
    };
  };
}>;

interface GetInventoryParams {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
    "inventory-code": string;
  }>;
}

export async function GET(
  req: NextRequest,
  props: GetInventoryParams,
): Promise<NextResponse<GetInventoryResponse | ErrorResponse>> {
  try {
    const params = await props.params;
    const archiveCode = params["archive-code"];
    const fondCode = params["fond-code"];
    const inventoryCode = params["inventory-code"];
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0");

    if (!archiveCode || !fondCode || !inventoryCode) {
      return NextResponse.json(
        { message: '"archive-code", "fond-code" and "inventory-code" params are required' },
        { status: 400 },
      );
    }

    const inventory = await getInventoryByCode(archiveCode, fondCode, inventoryCode, page);

    if (!inventory) {
      return NextResponse.json({ message: "Inventory not found" }, { status: 404 });
    }

    return NextResponse.json(inventory, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
