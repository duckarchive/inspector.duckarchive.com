import { handleSendMessageTG } from "@/lib/sendNotification";
import data from "@/_notification.json";

const main = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await handleSendMessageTG(token, data as any);
};

main();