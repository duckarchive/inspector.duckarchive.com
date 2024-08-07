import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../db";

export type GetAllArchivesResponse = Prisma.ArchiveGetPayload<{
  select: {
    id: true;
    code: true;
    title: true;
    matches: {
      select: {
        updated_at: true;
        last_count: true;
        children_count: true;
        resource_id: true;
      };
    };
  };
}>[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetAllArchivesResponse>) {
  // READ ALL DATA
  if (req.method === "GET") {
    const archives = await prisma.archive.findMany({
      select: {
        id: true,
        code: true,
        title: true,
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
            resource_id: true,
          },
        },
      },
    });
    res.setHeader('Cache-Control', 'public, max-age=864000');
    res.json(archives);
  } else {
    res.status(405);
  }
}

// export default async function handler(req: NextApiRequest, res: NextApiResponse<GetAllArchivesResponse>) {
//   // READ ALL DATA
//   if (req.method === 'GET') {
//     const now = Date.now();
//     const archives = await prisma.archive.findMany({
//       include: {
//         matches: {
//           include: {
//             results: {
//               take: 1,
//               orderBy: {
//                 created_at: 'desc'
//               },
//             }
//           },
//         }
//       }
//     });
//     console.log(`[GET] /api/archives: ${Date.now() - now}ms`);
//     res.json(archives);
//   } else {
//     res.status(405);
//   }
// }
