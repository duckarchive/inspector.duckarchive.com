import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { PublicAuthor, getAuthors } from "@/app/api/authors/data";

export type GetAuthorsResponse = PublicAuthor[];

/** Public author search, shared by the report wizard and the editor pickers. */
export async function GET(req: NextRequest): Promise<NextResponse<GetAuthorsResponse | ErrorResponse>> {
  try {
    const query = req.nextUrl.searchParams.get("q");
    const authors = await getAuthors(query?.trim() || undefined);
    return NextResponse.json(authors);
  } catch (error) {
    console.error("Error fetching authors:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
