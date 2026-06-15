import { GetInventoryResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/route";
import prisma from "@/lib/db";

export const getInventoryByCode = async (
  archiveCode: string,
  fondCode: string,
  inventoryCode: string,
  page: number = 0
): Promise<GetInventoryResponse | null> => {
  const inventory = await prisma.inventory.findFirst({
    where: {
      fond: {
        code: fondCode,
        archive: {
          code: archiveCode,
        },
      },
      code: inventoryCode,
    },
    include: {
      years: true,
      online_copies: true,
    },
  });

  if (!inventory) {
    return null;
  }

  const files = await prisma.file.findMany({
    where: {
      inventory_id: inventory.id,
    },
    select: {
      id: true,
      code: true,
      title: true,
      years: true,
    },
    skip: page * 5000,
    take: 5000,
  });

  return { ...inventory, files };
};
