import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../db";

export type SearchRequest = Partial<{
  archiveCode: string;
  fundCode: string;
  descriptionCode: string;
  caseCode: string;
}>;

export type SearchResponse = Prisma.MatchGetPayload<{
  select: {
    id: true;
    url: true;
    archive: {
      select: {
        code: true;
        title: true;
      };
    };
    fund: {
      select: {
        code: true;
        title: true;
      };
    };
    description: {
      select: {
        code: true;
        title: true;
      };
    };
    case: {
      select: {
        code: true;
        title: true;
      };
    };
  };
}>[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse>) {
  if (req.method === "POST") {
    const { archiveCode, fundCode, descriptionCode, caseCode }: SearchRequest = req.body;

    const matches = await prisma.match.findMany({
      where: {
        archive: {
          code: archiveCode,
        },
        fund: {
          code: fundCode,
        },
        description: {
          code: descriptionCode,
        },
        ...(caseCode
          ? {
              case: {
                code: caseCode,
              },
            }
          : {
              case_id: {
                not: null,
              },
            }),
      },
      select: {
        id: true,
        url: true,
        archive: {
          select: {
            code: true,
            title: true,
          },
        },
        fund: {
          select: {
            code: true,
            title: true,
          },
        },
        description: {
          select: {
            code: true,
            title: true,
          },
        },
        case: {
          select: {
            code: true,
            title: true,
          },
        },
      },
      take: 10,
    });

    res.status(200).json(matches);
  } else {
    res.status(405);
  }
}
