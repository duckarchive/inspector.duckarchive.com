import { FamilySearchItem } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDuckUser } from "@/lib/user";
import { ErrorResponse } from "@/types";

export type GetFamilySearchProjectResponse = FamilySearchItem[];

export async function POST(req: NextRequest): Promise<NextResponse<GetFamilySearchProjectResponse | ErrorResponse>> {
  console.time("sync familysearch items");
  const user = await getDuckUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items: FamilySearchItem[] = await req.json();

  if (!items || !items.length) {
    return NextResponse.json({ message: "items list is required" }, { status: 400 });
  }

  const itemsResult = await prisma.$transaction(
    items.map((item) => {
      const { id, ...data } = item;
      return prisma.familySearchItem.upsert({
        where: { id },
        update: data,
        create: item,
      });
    }),
  );

  const projectIds: Record<string, boolean> = {};
  itemsResult.forEach((item) => {
    if (item.project_id) {
      projectIds[item.project_id] = true;
    }
  });

  await prisma.$transaction(
    Object.keys(projectIds).map((id) => {
      return prisma.familySearchProject.upsert({
        where: { id },
        create: { id, synced_at: new Date() },
        update: { synced_at: new Date() },
      });
    }),
  );
  console.log("Items, Projects", [itemsResult.length, Object.keys(projectIds).length]);
  console.timeEnd("sync familysearch items");

  return NextResponse.json(itemsResult);
}
