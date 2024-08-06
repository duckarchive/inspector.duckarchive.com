import { groupBy } from "lodash";
import { GetSyncReportResponse } from "../../pages/api/stats/report";
import {
  Button,
  ListItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  theme,
  UnorderedList,
  useDisclosure,
} from "@chakra-ui/react";
import { Link } from "@chakra-ui/next-js";

interface StatsReportProps {
  data: GetSyncReportResponse;
}

const StatsReport: React.FC<StatsReportProps> = ({ data }) => {
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
    const markdownLink = `[🗎 посилання на повний звіт 🗎](https://duck-inspector.netlify.app/stats)`;
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
        Звіт по архівам
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "xl" }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Нові справи за минулу добу</ModalHeader>
          <ModalBody>
            <UnorderedList mb={4}>
              {Object.entries(groupedByArchive).map(([archiveCode, rows]) => (
                <ListItem key={archiveCode} mb={4}>
                  <Link href={`/archives/${archiveCode}`} color={theme.colors.blue[500]}>
                    {archiveCode}
                  </Link>
                  : {rows.length}
                </ListItem>
              ))}
            </UnorderedList>
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

export default StatsReport;
