import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { EditorOnlineCopy, getEditorOnlineCopies, OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

export type GetEditorOnlineCopiesResponse = EditorOnlineCopy[];

export async function GET(req: NextRequest): Promise<NextResponse<GetEditorOnlineCopiesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const target = req.nextUrl.searchParams.get("target");
  if (target !== "inventory" && target !== "file") {
    return NextResponse.json({ message: '"target" must be "inventory" or "file"' }, { status: 400 });
  }
  const unlinkedOnly = req.nextUrl.searchParams.get("unlinked") !== "false";

  const copies = await getEditorOnlineCopies(target as OnlineCopyTarget, unlinkedOnly);
  return NextResponse.json(copies);
}
