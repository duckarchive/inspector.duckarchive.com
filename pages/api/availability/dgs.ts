import { Match, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

export type CheckDGSRequest = Partial<{
  dgs: string;
}>;

export type CheckDGSResponse = boolean | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckDGSResponse>) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const user = await authorizeGoogle(req);
  if (!user) {
    res.status(401).end();
    return;
  }
  if (req.method === "POST") {
    const { dgs } = req.body as CheckDGSRequest;
    if (!dgs) {
      res.status(400).json({ error: "dgs is required" });
      return;
    }
    const dgsMatch: Match | null = await prisma.match.findFirst({
      where: {
        api_params: `dgs:${dgs}`,
        children_count: {
          gt: 0
        }
      }
    });

    if (dgsMatch) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }
  }
}
