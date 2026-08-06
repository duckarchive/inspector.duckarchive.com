import { NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { getYearOverlaps, YearOverlapsResult } from "@/app/api/editor/years/overlaps/data";

export type GetYearOverlapsResponse = YearOverlapsResult;

export async function GET(): Promise<NextResponse<GetYearOverlapsResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await getYearOverlaps();
  return NextResponse.json(result);
}
