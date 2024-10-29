import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

const DAILY_DOWNLOAD_LIMIT = 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {;
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
    await prisma.userDownload.create({
      data: {
        user_id: user.id,
        count: Math.max(+req.body.count, 0)
      }
    });

    res.status(201).end();
    return;
  }
}
