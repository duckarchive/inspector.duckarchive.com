import { getDailyStats } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import DuckChart from "@/components/duck-chart";
import { getArchives } from "@/data/archives";
import { getTranslations } from "next-intl/server";

const StatsPage: NextPage = async () => {
  const t = await getTranslations("stats-page");
  const archives = await getArchives();
  const dailyStats = await getDailyStats();

  return (
    <>
      <PagePanel title={t("title")} description={t("description")} />
      <DuckChart data={dailyStats} archives={archives} />
    </>
  );
};

export default StatsPage;
