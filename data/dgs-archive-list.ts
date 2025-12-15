import { Match, ResourceType } from "@/generated/prisma/client";
import prisma from "@/lib/db";

export interface DGSArchiveListItem extends Pick<Match, "id" | "full_code" | "url" | "api_params"> {}

export const getDGSListByArchive = async (archiveCode: string): Promise<DGSArchiveListItem[]> => {
  const [code, pagination] = archiveCode.split("___");
  const [page, _total] = pagination ? pagination.split("-") : [undefined, undefined];
  const dgsList = await prisma.match.findMany({
    where: {
      archive: {
        code,
      },
      resource: {
        type: ResourceType.FAMILY_SEARCH,
      },
      case_id: {
        not: null,
      },
    },
    select: {
      id: true,
      full_code: true,
      url: true,
      api_params: true,
      fund: {
        select: {
          code: true,
        },
      },
      description: {
        select: {
          code: true,
        },
      },
      case: {
        select: {
          code: true,
        },
      }
    },
    take: 50000,
    skip: page ? (parseInt(page, 10) - 1) * 50000 : 0,
    orderBy: {
      api_params: "asc",
    },
  });

  return dgsList.map((item) => {
    return {
      ...item,
      full_code: item.full_code || `${code}-${item.fund?.code || ""}-${item.description?.code || ""}-${item.case?.code || ""}`.trim(),
      url: item.full_code ? item.url : "",
      api_params: item.api_params?.split(":")[1] || "",
    };
  });
};
