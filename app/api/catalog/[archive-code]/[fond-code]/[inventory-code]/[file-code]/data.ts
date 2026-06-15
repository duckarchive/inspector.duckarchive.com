import type { GetFileResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/route";
import { Availability } from "@/generated/prisma/client/enums";
import prisma from "@/lib/db";

export const getFileByCode = async (
  archiveCode: string,
  fondCode: string,
  inventoryCode: string,
  fileCode: string,
): Promise<GetFileResponse | null> => {
  const file = await prisma.file.findFirst({
    where: {
      full_code: `${archiveCode}-${fondCode}-${inventoryCode}-${fileCode}`,
    },
    include: {
      years: true,
      authors: {
        include: {
          author: true,
        },
      },
      locations: {
        select: {
          id: true,
          lat: true,
          lng: true,
          radius_m: true,
        },
      },
      online_copies: {
        where: {
          availability: Availability.PUBLIC,
        },
      },
    },
  });

  return file;
};
