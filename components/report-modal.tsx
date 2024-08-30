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
import { handleSendMessageTG, LIMIT_FUNDS } from "../lib/sendNotification";
import { siteConfig } from "../config/site";

interface ReportModalProps {
  data: ReportSummary;
}

const ReportModal: React.FC<ReportModalProps> = ({ data }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
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
              <Button onClick={() => handleSendMessageTG(telegramBotToken, data, siteConfig.url)}>Відправити в групу</Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReportModal;
