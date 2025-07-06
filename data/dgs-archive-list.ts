import { Match, ResourceType } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { parseDBParams } from "@duckarchive/framework";

export interface DGSArchiveListItem extends Pick<Match, "id" | "full_code" | "url" | "api_params"> {}

export const getDGSListByArchive = async (archiveCode: string): Promise<DGSArchiveListItem[]> => {
  const dgsList = await prisma.match.findMany({
    where: {
      archive: {
        code: archiveCode,
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
  });

  return dgsList.map((item) => {
    return {
      ...item,
      full_code: item.full_code || `${archiveCode}-${item.fund?.code || ""}-${item.description?.code || ""}-${item.case?.code || ""}`.trim(),
      url: item.full_code ? item.url : "",
      api_params: parseDBParams(item.api_params).dgs,
    };
  });
};
