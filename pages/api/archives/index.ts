import { PrismaClient, Archive } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export type GetAllArchivesResponse = Archive[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetAllArchivesResponse>) {
  // READ ALL DATA
  if (req.method === 'GET') {
    const archives = await prisma.archive.findMany();
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