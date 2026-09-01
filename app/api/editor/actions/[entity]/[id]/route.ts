import { NextRequest, NextResponse } from "next/server";
import { resolveDuckUser } from "@/lib/auth";
import { isEditorQueue, queueEntity } from "@/lib/editor-actions";
import { ErrorResponse } from "@/types";
import { ActionExecutionError, resolveAction } from "@/app/api/editor/actions/[entity]/[id]/data";
import { Prisma } from "@generated/prisma/client/client";

interface RouteParams {
  params: Promise<{ entity: string; id: string }>;
}

interface ResolveBody {
  resolution: "execute" | "reject";
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse<ErrorResponse | { id: string }>> {
  const { entity, id } = await params;
  if (!isEditorQueue(entity)) {
    return NextResponse.json({ message: "Invalid entity" }, { status: 404 });
  }

  const user = await resolveDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: ResolveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 422 });
  }
  if (body.resolution !== "execute" && body.resolution !== "reject") {
    return NextResponse.json({ message: '"resolution" must be "execute" or "reject"' }, { status: 422 });
  }

  try {
    const resolved = await resolveAction(queueEntity(entity), id, user.id, body.resolution);
    return NextResponse.json({ id: resolved.id });
  } catch (error) {
    if (error instanceof ActionExecutionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    // the DB keeps one online-copy row per (resource, url, target); a second one
    // (a race the adopt path in data.ts did not catch) is a conflict, not a 500
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Цей URL вже привʼязано до цієї цілі (дублікат онлайн-копії)" }, { status: 409 });
    }
    console.error("Error resolving editor action:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
