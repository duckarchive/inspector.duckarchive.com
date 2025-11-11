import type { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";
import prisma from "@/lib/db";

export const getCaseByCode = async (
  archiveCode: string,
  fundCode: string,
  descriptionCode: string,
  caseCode: string
): Promise<GetCaseResponse | null> => {
  const caseItem = await prisma.case.findFirst({
    where: {
      full_code: `${archiveCode}-${fundCode}-${descriptionCode}-${caseCode}`,
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
      matches: {
        where: {
          children_count: {
            gt: 0,
          },
        },
      },
    },
  });

  return caseItem;
};
