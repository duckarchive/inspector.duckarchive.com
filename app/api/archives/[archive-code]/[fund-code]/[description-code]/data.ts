import { GetDescriptionResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import prisma from "@/lib/db";

export const getDescriptionByCode = async (
  archiveCode: string,
  fundCode: string,
  descriptionCode: string,
  page: number = 0
): Promise<GetDescriptionResponse | null> => {
  const description = await prisma.description.findFirst({
    where: {
      fund: {
        code: fundCode,
        archive: {
          code: archiveCode,
        },
      },
      code: descriptionCode,
    },
    include: {
      years: true,
      online_copies: true,
    },
  });

  if (!description) {
    return null;
  }

  const cases = await prisma.case.findMany({
    where: {
      description_id: description.id,
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

  return { ...description, cases };
};
