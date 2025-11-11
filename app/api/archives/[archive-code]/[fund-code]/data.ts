import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";
import prisma from "@/lib/db";


export const getFundByCode = async (archiveCode: string, fundCode: string): Promise<GetFundResponse | null> => {
  const fund = await prisma.fund.findFirst({
    where: {
      archive: {
        code: archiveCode,
      },
      code: fundCode,
    },
    include: {
      years: true,
      descriptions: {
        select: {
          id: true,
          code: true,
          title: true,
          years: true,
          matches: {
            where: {
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
  return fund;
};