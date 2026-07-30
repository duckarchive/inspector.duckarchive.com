"use client";

import { ReportSummary } from "@/data/report";
import { Button, Modal, useOverlayState } from "@heroui/react";
import NextLink from "next/link";
import { handleSendMessageTG, LIMIT_FUNDS } from "@/lib/sendNotification";
import { siteConfig } from "@/config/site";

interface ReportModalProps {
  data: ReportSummary;
}

const ReportModal: React.FC<ReportModalProps> = ({ data }) => {
  const state = useOverlayState();
  const telegramBotToken = typeof window !== "undefined" && window.localStorage.getItem("duck_fs_tg_token");

  return (
    <Modal state={state}>
      <Button size="sm" onPress={state.open}>
        Звіт по архівах
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Нові справи за минулу добу</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-96 overflow-y-scroll">
              <ul>
                {data.map(({ archive_code, funds }) => (
                  <li key={archive_code} className="mb-4">
                    <NextLink href={`/archives/${archive_code}`} className="link">
                      {archive_code}
                    </NextLink>
                    :
                    <ul className="list-disc ml-4 text-sm">
                      {funds
                        .sort((a, b) => b.count - a.count)
                        .slice(0, LIMIT_FUNDS)
                        .map(({ fund_code, count }) => (
                          <li key={fund_code}>
                            <NextLink href={`/archives/${archive_code}/${fund_code}`} className="link text-sm">
                              {fund_code}
                            </NextLink>
                            : {count}
                          </li>
                        ))}
                      {funds.length > LIMIT_FUNDS && <li>та інші</li>}
                    </ul>
                  </li>
                ))}
              </ul>
            </Modal.Body>
            {telegramBotToken && (
              <Modal.Footer>
                <Button onPress={() => handleSendMessageTG(telegramBotToken, data, siteConfig.url)}>
                  Відправити в групу
                </Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ReportModal;
