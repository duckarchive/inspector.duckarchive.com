import { handleSendMessageTG } from "../lib/sendNotification";
import data from "../_notification.json";

const main = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  await handleSendMessageTG(token, data as any);
};

main();