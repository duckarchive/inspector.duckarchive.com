import { GetCatalogArchiveResponse } from "@/app/api/catalog/[archive-code]/route";
import prisma from "@/lib/db";

export const getCatalogArchiveByCode = async (archiveCode: string): Promise<GetCatalogArchiveResponse | null> => {
  const archive = await prisma.archive.findFirst({
    where: {
      code: archiveCode,
    },
    include: {
      fonds: {
        select: {
          id: true,
          code: true,
          title: true,
          years: true,
        },
      },
    },
  });
  return archive;
};
