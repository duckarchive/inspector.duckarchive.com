import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export type Archives = Prisma.ArchiveGetPayload<{
  select: {
    id: true;
    code: true;
    title: true;
    url: true;
  };
}>[];

export const getArchives = async () => {
  const archivesDb = await prisma.archive.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      url: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  return archivesDb;
};
