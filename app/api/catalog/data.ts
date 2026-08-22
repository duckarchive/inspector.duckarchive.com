import { GetCatalogArchivesResponse } from "@/app/api/catalog/route";
import prisma from "@/lib/db";

export const getCatalogArchives = async (): Promise<GetCatalogArchivesResponse> => {
  const archives = await prisma.archive.findMany({
    orderBy: {
      code: "asc",
    },
  });
  return archives;
};
