"use client";

import { groupBy } from "lodash";
import { Report } from "@/data/report";
import { Button, Link, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/react";

interface ReportModalProps {
  data: Report;
}

const ReportModal: React.FC<ReportModalProps> = ({ data }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleSendMessageTG = async (token: string | null) => {
    if (!token) {
      return;
    }
    const groupedByArchive = groupBy(data, "archive_code");
    const raw = Object.entries(groupedByArchive)
      .map(([archiveCode, rows]) => {
        return `*\\#${archiveCode}*: ${rows.length}`;
      })
      .join("\n\n");
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "\\-");
    const header = `*🌳 Знайдені справи за минулу добу*\n🗓️ ${date}\n\n`;
    const markdownLink = `Переглянути повний звіт можна [за посиланням](https://duck-inspector.netlify.app/stats).\n`;
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

  const groupedByArchive = groupBy(data, "archive_code");
  const telegramBotToken = localStorage.getItem("duck_fs_tg_token");

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
              {Object.entries(groupedByArchive).map(([archiveCode, rows]) => (
                <li key={archiveCode}>
                  <Link href={`/archives/${archiveCode}`}>
                    {archiveCode}
                  </Link>
                  : {rows.length}
                </li>
              ))}
            </ul>
          </ModalBody>
          {
            telegramBotToken && (
              <ModalFooter>
                <Button onClick={() => handleSendMessageTG(telegramBotToken)}>Відправити в групу</Button>
              </ModalFooter>
            )
          }
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReportModal;