import { Prisma } from "duck-inspector-schema";
import prisma from "@/lib/db";

export type FamilySearchProjectWithArchive  = Prisma.FamilySearchProjectGetPayload<{
  include: {
    archive: true;
  }
}>;

export const getFSProjects = async (): Promise<FamilySearchProjectWithArchive[]> => {
  const projects = await prisma.familySearchProject.findMany({
    include: {
      archive: true,
    }
  });

  return projects;
};