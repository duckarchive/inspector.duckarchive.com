'use client';

import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Bar } from 'react-chartjs-2';
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
import { GetMonthStatsResponse } from "../../pages/api/stats";
import { theme } from "@chakra-ui/react";
import PagePanel from "../components/PagePanel";

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
  Legend,
);

const StatsPage: NextPage = () => {
  const [stats, setStats] = useState<GetMonthStatsResponse>([[], []]);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch("/api/stats");
      const data = await response.json();
      setStats(data);
    };

    fetchStats();
  }, []);

  return (
    <>
      <PagePanel
        titleLabel="Статистика"
        title="Щодня сервер перевіряє джерела на наявність нових справ."
      />
      <Bar
        data={{
          labels: stats[0].map((stat) => stat.created_at.slice(0, 10)),
          datasets: [{
            label: "перевірено стан справ",
            data: stats[0].map((stat) => stat.count),
            borderWidth: 1,
            backgroundColor: theme.colors.blue[300],
          },{
            label: "перевірено фондів/описів на наявність нових справ",
            data: stats[1].map((stat) => stat.count),
            borderWidth: 1,
            backgroundColor: theme.colors.green[300],
          }]
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
}

export default StatsPage;
