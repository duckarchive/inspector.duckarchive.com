import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { isEditorQueue, queueEntity } from "@/lib/editor-actions";
import { ErrorResponse } from "@/types";
import { ActionExecutionError } from "@/app/api/editor/actions/[entity]/[id]/data";
import { ActionPreview, buildActionPreview } from "@/app/api/editor/actions/[entity]/[id]/preview/data";

interface RouteParams {
  params: Promise<{ entity: string; id: string }>;
}

export type GetActionPreviewResponse = ActionPreview;

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<GetActionPreviewResponse | ErrorResponse>> {
  const { entity, id } = await params;
  if (!isEditorQueue(entity)) {
    return NextResponse.json({ message: "Invalid entity" }, { status: 404 });
  }

  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const preview = await buildActionPreview(queueEntity(entity), id);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof ActionExecutionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Error building action preview:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
