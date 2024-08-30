import { ReportSummary } from "../data/report";
import { siteConfig } from "../config/site";
import fs from "fs/promises";

const PATH = "_notification.json";

export const LIMIT_FUNDS = 3;

export const handleSendMessageTG = async (token: string | null | undefined, notificationData: ReportSummary, baseUrl?: string) => {
  if (!token || !notificationData?.length) {
    console.log("No token or data to send");
    return;
  }
  const raw = notificationData
    .map(({ archive_code, funds }) => {
      const archiveRow = `*\\#${archive_code}*:\n${funds
        .sort((a, b) => b.count - a.count)
        .slice(0, LIMIT_FUNDS)
        .map(({ fund_code, count }) => `  - [фонд ${fund_code}](${siteConfig.url || baseUrl}/archives/${archive_code}/${fund_code}): ${count}`)
        .join("\n")}`;

      if (funds.length > LIMIT_FUNDS) {
        return archiveRow + "\n  - та інші...";
      }
      return archiveRow;
    })
    .join("\n\n");
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "\\-");
  const header = `*🌳 Знайдені справи за минулу добу*\n🗓️ ${date}\n\n`;
  const markdownLink = `Переглянути повний звіт можна [за посиланням](${siteConfig.url || baseUrl}/stats)\n`;
  const message = header + raw.replace(/(-|\+|\.|=)/g, "\\$1") + `\n\n${markdownLink}`;
  // const message = header + raw.replace(/(-|\+|\(|\)|\.|=)/g, "\\$1") + `\n\n${markdownLink}`;

  console.log(message);

  // const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  //   headers: {
  //     "content-type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     parse_mode: "MarkdownV2",
  //     chat_id: "-1002155783741",
  //     text: message,
  //   }),
  //   method: "POST",
  //   mode: "cors",
  // });
};

const main = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const data = await fs.readFile(PATH, "utf-8").then((data) => JSON.parse(data)).catch(() => []); 

  await handleSendMessageTG(token, data);
};

main();