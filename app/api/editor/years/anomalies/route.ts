import { NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { getYearAnomalies, YearAnomaliesResult } from "@/app/api/editor/years/anomalies/data";

export type GetYearAnomaliesResponse = YearAnomaliesResult;

export async function GET(): Promise<NextResponse<GetYearAnomaliesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await getYearAnomalies();
  return NextResponse.json(result);
}
