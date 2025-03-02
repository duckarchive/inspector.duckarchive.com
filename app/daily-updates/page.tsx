import { getResources } from "@/data/resources";
import { getYesterdayReport } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import ReportTable from "@/components/report-table";
import ReportModal from "@/components/report-modal";
import { getTranslations } from "next-intl/server";

const DailyUpdatesPage: NextPage = async () => {
  const t = await getTranslations("daily-updates-page");
  const resources = await getResources();
  const [report, reportSummary] = await getYesterdayReport();
  const note = report.length >= 25000 ? t("limit-note"): "";

  return (
    <>
      <PagePanel title={t("title")} description={`${t("description")}${note}`}>
        <ReportModal data={reportSummary} />
      </PagePanel>
      <ReportTable resources={resources} report={report} />
    </>
  );
};

export default DailyUpdatesPage;
