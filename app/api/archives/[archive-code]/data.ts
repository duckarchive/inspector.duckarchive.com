import { GetArchiveResponse } from "@/app/api/archives/[archive-code]/route";
import prisma from "@/lib/db";

export const getArchiveByCode = async (archiveCode: string): Promise<GetArchiveResponse | null> => {
  const archive = await prisma.archive.findFirst({
    where: {
      code: archiveCode,
    },
    include: {
      funds: {
        select: {
          id: true,
          code: true,
          title: true,
          years: true,
          matches: {
            where: {
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
      },
    },
  });
  return archive;
};
