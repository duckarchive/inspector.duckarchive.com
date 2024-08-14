"use client";

import { ReportSummary } from "@/data/report";
import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";

interface ReportModalProps {
  data: ReportSummary;
}

const ReportModal: React.FC<ReportModalProps> = ({ data }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleSendMessageTG = async (token: string | null) => {
    if (!token) {
      return;
    }
    const raw = data.map(({ code, count }) => {
        return `*\\#${code}*: ${count}`;
      })
      .join("\n\n");
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "\\-");
    const header = `*🌳 Знайдені справи за минулу добу*\n🗓️ ${date}\n\n`;
    const markdownLink = `Переглянути повний звіт можна [за посиланням](https://duck-inspector.netlify.app/stats)\n`;
    const message = header + raw.replace(/(-|\+|\(|\)|\.|=)/g, "\\$1") + `\n\n${markdownLink}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        parse_mode: "MarkdownV2",
        chat_id: "-1002155783741",
        text: message,
      }),
      method: "POST",
      mode: "cors",
    });
  };

  const telegramBotToken = typeof window !== "undefined" && window.localStorage.getItem("duck_fs_tg_token");

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        Звіт по архівах
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Нові справи за минулу добу</ModalHeader>
          <ModalBody>
            <ul>
              {data.map(({ code, count }) => (
                <li key={code}>
                  <Link href={`/archives/${code}`}>{code}</Link>: {count}
                </li>
              ))}
            </ul>
          </ModalBody>
          {telegramBotToken && (
            <ModalFooter>
              <Button onClick={() => handleSendMessageTG(telegramBotToken)}>
                Відправити в групу
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReportModal;
