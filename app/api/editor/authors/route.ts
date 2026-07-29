import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { EditorAuthor, getEditorAuthors } from "@/app/api/editor/authors/data";

export type GetEditorAuthorsResponse = EditorAuthor[];

export async function GET(req: NextRequest): Promise<NextResponse<GetEditorAuthorsResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  const authors = await getEditorAuthors(query ?? undefined);
  return NextResponse.json(authors);
}
