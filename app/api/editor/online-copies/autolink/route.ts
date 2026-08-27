import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { ErrorResponse } from "@/types";
import {
  AutolinkCounts,
  AutolinkPreview,
  createAutolinkActions,
  getAutolinkPreview,
} from "@/app/api/editor/online-copies/autolink/data";

// Both handlers scan-fold millions of rows (~20s preview, ~2min insert).
export const maxDuration = 300;

export type GetAutolinkPreviewResponse = AutolinkPreview;

export async function GET(): Promise<NextResponse<GetAutolinkPreviewResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getAutolinkPreview());
}

export interface PostAutolinkBody {
  strict: boolean;
}

export interface PostAutolinkResponse {
  created: AutolinkCounts;
}

export async function POST(req: NextRequest): Promise<NextResponse<PostAutolinkResponse | ErrorResponse>> {
  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as PostAutolinkBody | null;
  if (!body || typeof body.strict !== "boolean") {
    return NextResponse.json({ message: '"strict" (boolean) обовʼязковий' }, { status: 422 });
  }

  const created = await createAutolinkActions(body.strict, user.id);
  return NextResponse.json({ created }, { status: 201 });
}
