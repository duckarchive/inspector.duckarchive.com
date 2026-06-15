import { GetFondResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/route";
import prisma from "@/lib/db";

export const getFondByCode = async (archiveCode: string, fondCode: string): Promise<GetFondResponse | null> => {
  const fond = await prisma.fond.findFirst({
    where: {
      archive: {
        code: archiveCode,
      },
      code: fondCode,
    },
    include: {
      years: true,
      inventories: {
        select: {
          id: true,
          code: true,
          title: true,
          years: true,
        },
      },
    },
  });
  return fond;
};
