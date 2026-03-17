import { Archive } from "@generated/prisma/client/client";
import { NextResponse } from "next/server";
import { ErrorResponse } from "@/types";
import { getArchives } from "@/app/api/archives/data";

export type GetArchivesResponse = Archive[];

export async function GET(): Promise<NextResponse<GetArchivesResponse | ErrorResponse>> {
  try {
    const archives = await getArchives();

    if (archives && archives.length > 0) {
      return NextResponse.json(archives, { status: 200 });
    } else {
      return NextResponse.json({ message: "Archives not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching archives:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
