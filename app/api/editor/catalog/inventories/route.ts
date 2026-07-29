import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { EditorInventory, getEditorInventories } from "@/app/api/editor/catalog/inventories/data";

export type GetEditorInventoriesResponse = EditorInventory[];

export async function GET(req: NextRequest): Promise<NextResponse<GetEditorInventoriesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const fond = req.nextUrl.searchParams.get("fond");
  if (!fond) {
    return NextResponse.json({ message: '"fond" query param is required' }, { status: 400 });
  }

  const inventories = await getEditorInventories(fond);
  return NextResponse.json(inventories);
}
