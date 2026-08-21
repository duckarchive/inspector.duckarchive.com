import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import { deleteYearRange } from "@/app/api/editor/years/anomalies/data";
import { YearEntity } from "@/lib/year-entity";

export interface DeleteYearRangeBody {
  entity: YearEntity;
  parent_id: string;
  start_year: number;
  end_year: number;
}

export type DeleteYearRangeResponse = { ok: true };

const isYearEntity = (value: unknown): value is YearEntity => value === "fond" || value === "inventory" || value === "file";

export async function POST(req: NextRequest): Promise<NextResponse<DeleteYearRangeResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: DeleteYearRangeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }

  if (!isYearEntity(body.entity)) {
    return NextResponse.json({ message: '"entity" must be "fond", "inventory" or "file"' }, { status: 422 });
  }
  if (!body.parent_id || typeof body.start_year !== "number" || typeof body.end_year !== "number") {
    return NextResponse.json({ message: '"parent_id", "start_year" and "end_year" are required' }, { status: 422 });
  }

  await deleteYearRange(body.entity, body.parent_id, body.start_year, body.end_year);
  return NextResponse.json({ ok: true });
}
