import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { getAuthorFileIds } from "@/app/api/editor/authors/data";

export interface GetAuthorFilesResponse {
  file_ids: string[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<GetAuthorFilesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const file_ids = await getAuthorFileIds(id);
  return NextResponse.json({ file_ids });
}
