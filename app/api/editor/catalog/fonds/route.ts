import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { EditorFond, getEditorFonds } from "@/app/api/editor/catalog/fonds/data";

export type GetEditorFondsResponse = EditorFond[];

export async function GET(req: NextRequest): Promise<NextResponse<GetEditorFondsResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const archive = req.nextUrl.searchParams.get("archive");
  if (!archive) {
    return NextResponse.json({ message: '"archive" query param is required' }, { status: 400 });
  }

  const fonds = await getEditorFonds(archive);
  return NextResponse.json(fonds);
}
