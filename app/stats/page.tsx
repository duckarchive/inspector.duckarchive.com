import { getDailyStats } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import DuckChart from "@/components/duck-chart";
import { getArchives } from "../../data/archives";

const StatsPage: NextPage = async () => {
  const archives = await getArchives();
  const dailyStats = await getDailyStats();

  return (
    <>
      <PagePanel title="Статистика доступності справ" description="Оберіть архів, щоб побачити статистику по дням та ресурсам" />
      <DuckChart data={dailyStats} archives={archives} />
    </>
  );
};

export default StatsPage;
