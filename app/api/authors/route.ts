import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { PublicAuthor, getAuthors } from "@/app/api/authors/data";
import { LATIN_LETTER } from "@/lib/validate";

export type GetAuthorsResponse = PublicAuthor[];

/** Public author search, shared by the report wizard and the editor pickers. */
export async function GET(req: NextRequest): Promise<NextResponse<GetAuthorsResponse | ErrorResponse>> {
  try {
    const query = req.nextUrl.searchParams.get("q")?.trim() || undefined;
    if (query && (query.length > 200 || LATIN_LETTER.test(query))) {
      return NextResponse.json({ message: '"q" must not contain Latin letters' }, { status: 400 });
    }
    const authors = await getAuthors(query);
    return NextResponse.json(authors);
  } catch (error) {
    console.error("Error fetching authors:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
