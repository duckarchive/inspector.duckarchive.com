import { Prisma, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export type GetArchiveResponse = Prisma.ArchiveGetPayload<{
  include: {
    matches: {
      where: {
        fund_id: null;
        description_id: null;
        case_id: null;
      };
      select: {
        updated_at: true,
        last_count: true;
        children_count: true;
        resource: {
          select: {
            type: true;
          };
        };
      };
    };
    funds: {
      select: {
        id: true;
        code: true;
        title: true;
      };
    };
  };
}>

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetArchiveResponse>
) {
  const archiveCode = req.query["archive-code"] as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const archive = await prisma.archive.findFirst({
      where: {
        code: archiveCode,
      },
      include: {
        matches: {
          where: {
            fund_id: null,
            description_id: null,
            case_id: null,
          },
          select: {
            updated_at: true,
            last_count: true,
            children_count: true,
            resource: {
              select: {
                type: true,
              },
            },
          }
        },
        funds: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      }
    });
    if (archive) {
      res.json(archive);
    } else {
      res.status(404);
    }
  }
}
