import { NextApiRequest, NextApiResponse } from "next";
import { authorizeGoogle } from "@/lib/auth";

export type ReportDGSRequest = Partial<{
  dgs: string;
}>;

export type ReportDGSResponse = boolean | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ReportDGSResponse>) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  const user = await authorizeGoogle(req);
  if (!user) {
    res.status(401).end();
    return;
  }
  if (req.method === "POST") {
    const { dgs } = req.body as ReportDGSRequest;
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      res.status(400).json({ error: "Telegram bot token is not configured" });
    }
    if (!dgs) {
      res.status(400).json({ error: "dgs is required" });
      return;
    }
    const raw = `*Запит на розгляд DGS*\n\nВідправник: ${user.email}\nDGS: [${dgs}](https://www.familysearch.org/records/images/search-results?imageGroupNumbers=${dgs})`;
    const message = raw.replace(/(-|\+|\.|=)/g, "\\$1");

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        parse_mode: "MarkdownV2",
        chat_id: "-1002480412691",
        text: message,
      }),
      method: "POST",
      mode: "cors",
    });

    res.status(200).end();
  }
}
