import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { isEditorEntity } from "@/lib/editor-actions";
import { ErrorResponse } from "@/types";
import { ActionExecutionError, resolveAction } from "@/app/api/editor/actions/[entity]/[id]/data";

interface RouteParams {
  params: Promise<{ entity: string }>;
}

interface BatchResolveRequest {
  id: string;
  resolution: "execute" | "reject";
}

export interface BatchResolveResponse {
  resolved: number;
  errors: Array<{ id: string; message: string }>;
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<BatchResolveResponse | ErrorResponse>> {
  const { entity } = await params;
  if (!isEditorEntity(entity)) {
    return NextResponse.json({ message: "Invalid entity" }, { status: 404 });
  }

  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let bodies: BatchResolveRequest[];
  try {
    bodies = await req.json();
    if (!Array.isArray(bodies)) {
      return NextResponse.json({ message: "Body must be an array" }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }

  const errors: Array<{ id: string; message: string }> = [];
  let resolved = 0;

  for (const item of bodies) {
    if (!item.id || !item.resolution) {
      errors.push({ id: item.id || "unknown", message: '"id" and "resolution" are required' });
      continue;
    }

    if (item.resolution !== "execute" && item.resolution !== "reject") {
      errors.push({ id: item.id, message: '"resolution" must be "execute" or "reject"' });
      continue;
    }

    try {
      await resolveAction(entity, item.id, user.id, item.resolution);
      resolved++;
    } catch (error) {
      if (error instanceof ActionExecutionError) {
        errors.push({ id: item.id, message: error.message });
      } else {
        console.error("Error resolving editor action:", error);
        errors.push({ id: item.id, message: "Internal Server Error" });
      }
    }
  }

  return NextResponse.json(
    { resolved, errors },
    { status: errors.length > 0 && resolved === 0 ? 422 : 200 },
  );
}
