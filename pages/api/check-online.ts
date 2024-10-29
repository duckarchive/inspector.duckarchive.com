import { Match, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

export type CheckOnlineRequest = Partial<{
  full_codes: string[];
}>;

export type CheckOnlineResponse = boolean[] | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckOnlineResponse>) {
  const isAuth = await isAuthorized(req);
  if (!isAuth) {
    return res.status(401).end();
  }
  if (req.method === "POST") {
    const { full_codes } = req.body as CheckOnlineRequest;
    if (!full_codes || !full_codes.length) {
      res.status(400).json({ error: "full_codes is required" });
      return;
    }
    if (full_codes.length > 100) {
      res.status(400).json({ error: "full_codes length should be less than 100" });
      return;
    }
    const matches: Match[] = await prisma.$queryRaw`
      select full_code from matches
      where full_code in (${Prisma.join(full_codes)}) and children_count > 0
    `;

    const matchesHash: Record<string, boolean> = {};

    matches.forEach((match) => {
      matchesHash[match.full_code || ""] = true;
    });

    const searchResults = full_codes
      .map((fc) => {
        if (matchesHash[fc]) {
          return true;
        }
        return false;
      })

    if (searchResults) {
      res.json(searchResults);
    } else {
      res.status(404).end();
    }
  }
}
