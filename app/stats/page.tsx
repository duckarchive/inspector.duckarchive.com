import { getResources } from "@/data/resources";
import { getYesterdayReport } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import ReportTable from "../../components/report-table";

const ReportPage: NextPage = async () => {
  const resources = await getResources();
  const report = await getYesterdayReport();

  return (
    <>
      <PagePanel
        title="Звіт"
        description="Список справ онлайн, знайдених за минулу добу"
      />
      <ReportTable resources={resources} report={report} />
    </>
  );
};

export default ReportPage;
