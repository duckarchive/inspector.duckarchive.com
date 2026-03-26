import { FamilySearchItem } from "@generated/prisma/client/client";
import { Prisma } from "@generated/prisma/client/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDuckUser } from "@/lib/user";
import { ErrorResponse } from "@/types";
import chunk from "lodash/chunk.js";
import uniq from "lodash/uniq.js";

export type GetFamilySearchProjectResponse = FamilySearchItem[];

const BATCH_SIZE = 500;

async function upsertItemsBatch(items: FamilySearchItem[]): Promise<void> {
  if (!items.length) return;

  const values = items.map(
    (item) =>
      Prisma.sql`(${item.id}, ${item.dgs}, ${item.archival_reference}, ${item.volume}, ${item.volumes}, ${item.date}, ${item.image_count}::int, ${item.project_id}, ${item.title}, ${item.creator}, ${item.indexed_child_count}::int)`,
  );

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO family_search_items (id, dgs, archival_reference, volume, volumes, date, image_count, project_id, title, creator, indexed_child_count)
    VALUES ${Prisma.join(values)}
    ON CONFLICT (id) DO UPDATE SET
      dgs = EXCLUDED.dgs,
      archival_reference = EXCLUDED.archival_reference,
      volume = EXCLUDED.volume,
      volumes = EXCLUDED.volumes,
      date = EXCLUDED.date,
      image_count = EXCLUDED.image_count,
      project_id = EXCLUDED.project_id,
      title = EXCLUDED.title,
      creator = EXCLUDED.creator,
      indexed_child_count = EXCLUDED.indexed_child_count,
      updated_at = NOW()
  `);
}

async function upsertProjects(projectIds: string[]): Promise<void> {
  if (!projectIds.length) return;

  const values = projectIds.map((id) => Prisma.sql`(${id}, NOW())`);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO family_search_projects (id, synced_at)
    VALUES ${Prisma.join(values)}
    ON CONFLICT (id) DO UPDATE SET synced_at = NOW()
  `);
}

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

  // upsert projects first to ensure FK
  const projectIds = uniq(items.map((item) => item.project_id).filter(Boolean));
  await upsertProjects(projectIds);

  for (const batch of chunk(items, BATCH_SIZE)) {
    await upsertItemsBatch(batch);
  }

  console.log("Items, Projects", [items.length, projectIds.length]);
  console.timeEnd("sync familysearch items");

  return NextResponse.json(items);
}
