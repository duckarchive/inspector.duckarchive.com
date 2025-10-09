import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";
import { ErrorResponse } from "@/types";

export type GetFamilySearchProjectResponse =
  | Prisma.FamilySearchProjectGetPayload<{
      include: {
        archive: true;
      };
    }>[];

export async function GET(req: NextRequest): Promise<NextResponse<GetFamilySearchProjectResponse | ErrorResponse>> {
  const user = await authorizeGoogle(req, true);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.familySearchProject.findMany({
    where: {
      archive_id: {
        not: null,
      },
    },
    include: {
      archive: true,
    },
  });

  return NextResponse.json(projects);
}
