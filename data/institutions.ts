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

export const getInstitutions = async () => {
  const authorsDb = await prisma.author.findMany({
    select: {
      id: true,
      lat: true,
      lng: true,
      title: true,
      info: true,
      tags: true,
    },
    where: {
      lat: { not: null },
      lng: { not: null },
    },
  });

  return authorsDb;
};
