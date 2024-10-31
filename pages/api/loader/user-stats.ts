import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

const DAILY_DOWNLOAD_LIMIT = 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const user = await authorizeGoogle(req);
  if (!user) {
    res.status(401).end();
    return;
  }
  if (req.method === "GET") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const userTodayDownloads = await prisma.userDownload.findMany({
      where: {
        user_id: user.id,
        created_at: {
          gte: startOfToday
        }
      }
    });

    const totalTodayDownloads = userTodayDownloads.reduce((acc, curr) => acc + curr.count, 0);
    res.json({
      total: totalTodayDownloads,
      left: DAILY_DOWNLOAD_LIMIT - totalTodayDownloads
    });
    return;
  }
  if (req.method === "POST") {
    const { count } = req.body as { count: number };
    const normalizedCount = Math.max(count, 0);
    const user_id = user.id;
    console.log({ body: req.body, count, normalizedCount, user_id });
    if (normalizedCount) {
      await prisma.userDownload.create({
        data: {
          user_id,
          count: normalizedCount
        }
      });
    }

    res.status(201).end();
    return;
  }
}
