import { Match, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

export type CheckOnlineRequest = Partial<{
  full_codes: string[];
}>;

export type CheckOnlineResponse = boolean[] | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckOnlineResponse>) {
  const userInfo = await authorizeGoogle(req);
  if (!userInfo) {
    return res.status(401);
  }
  if (req.method === "GET") {
    res.json(userInfo);
    // const matches: Match[] = await prisma.$queryRaw`
    //   select full_code from matches
    //   where full_code in (${Prisma.join(full_codes)}) and children_count > 0
    // `;
    // if (searchResults) {
    //   res.json(searchResults);
    // } else {
    //   res.status(404);
    // }
  }
}
