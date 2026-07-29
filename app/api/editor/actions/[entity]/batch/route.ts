import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@generated/prisma/client/client";
import { resolveDuckUser } from "@/lib/auth";
import { isEditorEntity, SubmitActionBody, validateSubmitAction } from "@/lib/editor-actions";
import { ErrorResponse } from "@/types";
import { targetExists, createAction } from "@/app/api/editor/actions/[entity]/data";

interface RouteParams {
  params: Promise<{ entity: string }>;
}

export interface BatchActionResponse {
  created: number;
  errors: Array<{ index: number; message: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<BatchActionResponse | ErrorResponse>> {
  const { entity } = await params;
  if (!isEditorEntity(entity)) {
    return NextResponse.json({ message: "Invalid entity" }, { status: 404 });
  }

  const user = await resolveDuckUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.is_banned) {
    return NextResponse.json({ message: "Banned" }, { status: 403 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let bodies: SubmitActionBody[];
  try {
    bodies = await req.json();
    if (!Array.isArray(bodies)) {
      return NextResponse.json({ message: "Body must be an array" }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }

  const errors: Array<{ index: number; message: string }> = [];
  let created = 0;

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];

    // Validate
    const validationError = validateSubmitAction(entity, body);
    if (validationError) {
      errors.push({ index: i, message: validationError });
      continue;
    }

    // Check target exists
    if (body.target_id && !(await targetExists(entity, body.target_id))) {
      errors.push({ index: i, message: "Target not found" });
      continue;
    }

    // Create action
    try {
      await createAction(entity, body, user.id);
      created++;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        errors.push({ index: i, message: "Така дія вже очікує на розгляд" });
      } else {
        console.error("Error creating editor action:", error);
        errors.push({ index: i, message: "Internal Server Error" });
      }
    }
  }

  return NextResponse.json({ created, errors }, { status: errors.length > 0 && created === 0 ? 422 : 201 });
}
