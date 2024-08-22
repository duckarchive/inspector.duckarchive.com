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
import { siteConfig } from "../config/site";

const LIMIT_FUNDS = 3;

interface ReportModalProps {
  data: ReportSummary;
}

const ReportModal: React.FC<ReportModalProps> = ({ data }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleSendMessageTG = async (token: string | null) => {
    if (!token) {
      return;
    }
    const raw = data
      .map(({ archive_code, funds }) => {
        const archiveRow = `*\\#${archive_code}*:\n${funds
          .sort((a, b) => b.count - a.count)
          .slice(0, LIMIT_FUNDS)
          .map(({ fund_code, count }) => `  - [фонд ${fund_code}](${siteConfig.url}/archives/${archive_code}/${fund_code}): ${count}`)
          .join("\n")}`;

        if (funds.length > LIMIT_FUNDS) {
          return archiveRow + "\n  - та інші...";
        }
        return archiveRow;
      })
      .join("\n\n");
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "\\-");
    const header = `*🌳 Знайдені справи за минулу добу*\n🗓️ ${date}\n\n`;
    const markdownLink = `Переглянути повний звіт можна [за посиланням](${siteConfig.url}/stats)\n`;
    const message = header + raw.replace(/(-|\+|\.|=)/g, "\\$1") + `\n\n${markdownLink}`;
    // const message = header + raw.replace(/(-|\+|\(|\)|\.|=)/g, "\\$1") + `\n\n${markdownLink}`;

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
          <ModalBody className="max-h-96 overflow-y-scroll">
            <ul>
              {data.map(({ archive_code, funds }) => (
                <li key={archive_code} className="mb-4">
                  <Link href={`/archives/${archive_code}`}>{archive_code}</Link>:
                  <ul className="list-disc ml-4 text-sm">
                    {funds
                      .sort((a, b) => b.count - a.count)
                      .slice(0, LIMIT_FUNDS)
                      .map(({ fund_code, count }) => (
                        <li key={fund_code}>
                          <Link href={`/archives/${archive_code}/${fund_code}`} className="text-sm">{fund_code}</Link>: {count}
                        </li>
                      ))}
                    {funds.length > LIMIT_FUNDS && <li>та інші</li>}
                  </ul>
                </li>
              ))}
            </ul>
          </ModalBody>
          {telegramBotToken && (
            <ModalFooter>
              <Button onClick={() => handleSendMessageTG(telegramBotToken)}>Відправити в групу</Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReportModal;
