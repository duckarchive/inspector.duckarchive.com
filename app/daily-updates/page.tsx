import { getResources } from "@/data/resources";
import { getYesterdayReport } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import ReportTable from "@/components/report-table";
import ReportModal from "@/components/report-modal";

const DailyUpdatesPage: NextPage = async () => {
  const resources = await getResources();
  const [report, reportSummary] = await getYesterdayReport();
  const note = report.length >= 25000 ? " Максимальна кількість знахідок обмежена 25,000.": "";

  return (
    <>
      <PagePanel title="Звіт" description={`Список справ онлайн, знайдених за минулу добу.${note}`}>
        <ReportModal data={reportSummary} />
      </PagePanel>
      <ReportTable resources={resources} report={report} />
    </>
  );
};

export default DailyUpdatesPage;
