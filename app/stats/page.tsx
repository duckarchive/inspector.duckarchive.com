"use client";

import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  ArcElement,
  BarElement,
  TimeScale,
} from "chart.js";
import { GetLatestStatsResponse } from "../../pages/api/stats";
import { theme } from "@chakra-ui/react";
import PagePanel from "../components/PagePanel";
import { GetSyncReportResponse } from "../../pages/api/stats/report";
import DuckTable from "../components/Table";
import ResourceBadge from "../components/ResourceBadge";
import { Link } from "@chakra-ui/next-js";
import Loader from "../components/Loader";
import StatsReport from "../components/StatsReport";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

type TableItem = GetSyncReportResponse[number];

const StatsPage: NextPage = () => {
  const [stats, setStats] = useState<GetLatestStatsResponse>([[], []]);
  const [report, setReport] = useState<GetSyncReportResponse>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch("/api/stats");
      const data = await response.json();
      setStats(data);
    };
    const fetchReport = async () => {
      const response = await fetch("/api/stats/report");
      const data = await response.json();
      setReport(data);
      setIsLoaded(true);
    };

    fetchStats();
    fetchReport();
  }, []);

  return !isLoaded ? (
    <Loader />
  ) : (
    <>
      <PagePanel titleLabel="Статистика" title="Список справ знайдених онлайн за минулу добу">
        <StatsReport data={report} />
      </PagePanel>
      <DuckTable<TableItem>
        columns={[
          {
            field: "resource_id",
            headerName: "Ресурс",
            flex: 1.5,
            cellRenderer: (row: { value: TableItem["resource_id"] }) => <ResourceBadge resourceId={row.value} />,
          },
          {
            field: "archive_code",
            headerName: "Архів",
            filter: true,
            flex: 1,
          },
          {
            field: "fund_code",
            headerName: "Фонд",
            filter: true,
            flex: 1,
          },
          {
            field: "description_code",
            headerName: "Опис",
            filter: true,
            flex: 1,
          },
          {
            field: "case_code",
            headerName: "Справа",
            filter: true,
            flex: 1,
          },
          {
            field: "url",
            headerName: "Посилання",
            flex: 4,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value || "#"} isExternal color="blue.600">
                {row.value || "Щось пішло не так"}
              </Link>
            ),
          },
        ]}
        rows={report}
      />
      <Bar
        style={{ maxHeight: "150px" }}
        data={{
          labels: stats[0].map((stat) => stat.created_at.slice(0, 10)),
          datasets: [
            {
              label: "перевірено стан справ",
              data: stats[0].map((stat) => stat.count),
              borderWidth: 1,
              backgroundColor: theme.colors.blue[300],
            },
            {
              label: "перевірено фондів/описів на наявність нових справ",
              data: stats[1].map((stat) => stat.count),
              borderWidth: 1,
              backgroundColor: theme.colors.green[300],
            },
          ],
        }}
        options={{
          plugins: {
            legend: {
              display: false,
            },
          },
        }}
      />
    </>
  );
};

export default StatsPage;
