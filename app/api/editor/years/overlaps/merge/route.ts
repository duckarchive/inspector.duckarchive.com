import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { mergeYearRanges, MergeConflictError } from "@/app/api/editor/years/overlaps/data";
import { YearEntity, YearRangeRow } from "@/lib/year-entity";

export interface MergeYearRangesBody {
  entity: YearEntity;
  parent_id: string;
  ranges: YearRangeRow[];
}

export type MergeYearRangesResponse = { ok: true };

const isYearEntity = (value: unknown): value is YearEntity => value === "fond" || value === "inventory" || value === "file";

const isRangeArray = (value: unknown): value is YearRangeRow[] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  value.every((r) => r && typeof r.start_year === "number" && typeof r.end_year === "number");

export async function POST(req: NextRequest): Promise<NextResponse<MergeYearRangesResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: MergeYearRangesBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }

  if (!isYearEntity(body.entity)) {
    return NextResponse.json({ message: '"entity" must be "fond", "inventory" or "file"' }, { status: 422 });
  }
  if (!body.parent_id) {
    return NextResponse.json({ message: '"parent_id" is required' }, { status: 422 });
  }
  if (!isRangeArray(body.ranges)) {
    return NextResponse.json({ message: '"ranges" must contain at least 2 {start_year, end_year} entries' }, { status: 422 });
  }

  try {
    await mergeYearRanges(body.entity, body.parent_id, body.ranges);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MergeConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error("Error merging year ranges:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
