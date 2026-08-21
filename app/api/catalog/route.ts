import { Archive } from "@generated/prisma/client/client";
import { NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getCatalogArchives } from "@/app/api/catalog/data";

export type GetCatalogArchivesResponse = Archive[];

export async function GET(): Promise<NextResponse<GetCatalogArchivesResponse | ErrorResponse>> {
  try {
    const archives = await getCatalogArchives();

    if (archives.length > 0) {
      return NextResponse.json(archives, { status: 200 });
    } else {
      return NextResponse.json({ message: "Archives not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching catalog archives:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
