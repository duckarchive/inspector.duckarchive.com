import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export type GetLatestStatsResponse = {
  created_at: string;
  count: number;
}[][];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const matchesByDay: GetLatestStatsResponse[number] = await prisma.$queryRaw`
      select created_at::date, count(*)::integer
      from match_results
      group by created_at::date
      order by created_at::date desc
      limit 7;
    `;
    const fetchesByDay: GetLatestStatsResponse[number] = await prisma.$queryRaw`
      select created_at::date, count(*)::integer
      from fetch_results
      group by created_at::date
      order by created_at::date desc
      limit 7;
    `;
    res.json([matchesByDay.reverse(), fetchesByDay.reverse()]);
  } else {
    res.status(405);
  }
}
