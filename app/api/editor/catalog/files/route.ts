import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { EditorFile, getEditorFiles } from "@/app/api/editor/catalog/files/data";

export type GetEditorFilesResponse = EditorFile[];

export async function GET(req: NextRequest): Promise<NextResponse<GetEditorFilesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const inventory = req.nextUrl.searchParams.get("inventory");
  if (!inventory) {
    return NextResponse.json({ message: '"inventory" query param is required' }, { status: 400 });
  }

  const files = await getEditorFiles(inventory);
  return NextResponse.json(files);
}
