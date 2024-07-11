import { NextApiRequest, NextApiResponse } from "next";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    const { archiveCode, fundCode, descriptionCode, caseCode } = req.body;

    const query = {
      archiveCode,
      fundCode,
      descriptionCode,
      caseCode,
    };

    const matches =await prisma.match.findMany({
      where: {
        archive: {
          code: query.archiveCode,
        },
        fund: {
          code: query.fundCode,
        },
        description: {
          code: query.descriptionCode,
        },
        case: {
          code: query.caseCode,
        },
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