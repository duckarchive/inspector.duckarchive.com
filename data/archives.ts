import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type Archives = Prisma.ArchiveGetPayload<{
  select: {
    id: true;
    code: true;
    title: true;
    url: true;
    matches: {
      select: {
        updated_at: true;
        children_count: true;
        resource_id: true;
      };
    };
  };
}>[];;

export const getArchives = async () => {
  const archivesDb = await prisma.archive.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      url: true,
      matches: {
        where: {
          fund_id: null,
          description_id: null,
          case_id: null,
        },
        select: {
          updated_at: true,
          children_count: true,
          resource_id: true,
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  });

  return archivesDb;
};