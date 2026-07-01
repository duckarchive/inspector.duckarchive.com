import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@generated/prisma/client/client";
import { resolveDuckUser } from "@/lib/auth";
import { ActionStatus, isEditorEntity, SubmitActionBody, validateSubmitAction } from "@/lib/editor-actions";
import { ErrorResponse } from "@/types";
import { ActionRow, createAction, listActions, targetExists } from "@/app/api/editor/actions/[entity]/data";

interface RouteParams {
  params: Promise<{ entity: string }>;
}

export type SubmitActionResponse = Awaited<ReturnType<typeof createAction>>;
export type ListActionsResponse = ActionRow[];

export async function POST(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<SubmitActionResponse | ErrorResponse>> {
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

  let body: SubmitActionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }

  // "report" is open to any authenticated user; all other types require admin.
  // TODO: allow editors once the Duck API exposes is_editor.
  if (body.type !== "report" && !user.is_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const validationError = validateSubmitAction(entity, body);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 422 });
  }

  if (body.target_id && !(await targetExists(entity, body.target_id))) {
    return NextResponse.json({ message: "Target not found" }, { status: 404 });
  }

  try {
    const action = await createAction(entity, body, user.id);
    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Така дія вже очікує на розгляд" },
        { status: 409 },
      );
    }
    console.error("Error creating editor action:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ListActionsResponse | ErrorResponse>> {
  const { entity } = await params;
  if (!isEditorEntity(entity)) {
    return NextResponse.json({ message: "Invalid entity" }, { status: 404 });
  }

  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") as ActionStatus | null;
  const type = searchParams.get("type");
  const target_id = searchParams.get("target_id");

  const actions = await listActions(entity, {
    status: status ?? undefined,
    type: type ?? undefined,
    target_id: target_id ?? undefined,
  });

  return NextResponse.json(actions);
}
