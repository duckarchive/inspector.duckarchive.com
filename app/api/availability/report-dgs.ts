import { authorizeGoogle } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type ReportDGSRequest = Partial<{
  dgs: string;
}>;

export type ReportDGSResponse = boolean | ErrorResponse;

export async function POST(req: NextRequest): Promise<NextResponse<ReportDGSResponse>> {
  const user = await authorizeGoogle(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { dgs }: ReportDGSRequest = await req.json();
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ message: "Telegram bot token is not configured" }, { status: 400 });
  }
  if (!dgs) {
    return NextResponse.json({ message: '"dgs" is required' }, { status: 400 });
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

  return NextResponse.json(true);
}
