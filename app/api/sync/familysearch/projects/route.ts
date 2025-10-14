import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDuckUser } from "@/lib/user";
import { ErrorResponse } from "@/types";

export type GetFamilySearchProjectResponse =
  | Prisma.FamilySearchProjectGetPayload<{
      include: {
        archive: true;
      };
    }>[];

export async function GET(): Promise<NextResponse<GetFamilySearchProjectResponse | ErrorResponse>> {
  const user = await getDuckUser();
  if (!user || !user.is_admin) {
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
