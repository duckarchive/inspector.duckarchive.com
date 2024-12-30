"use client";

import { AgCharts } from "ag-charts-react";
import { DailyStatWithArchive } from "@/data/report";
import { useState } from "react";
import { Archives } from "@/data/archives";
import SelectArchive from "./select-archive";
import useNoRussians from "@/hooks/useNoRussians";

interface DuckChartProps {
  archives: Archives;
  data: DailyStatWithArchive[];
}

const DuckChart: React.FC<DuckChartProps> = ({ data, archives }) => {
  useNoRussians();
  const dataWithFormattedDate = data.map((stat) => ({
    ...stat,
    created_at: new Date(stat.created_at).toLocaleDateString("uk-UA"),
  }));
  const [selectedArchiveCode, setSelectedArchiveCode] = useState<string>();

  const filteredData = selectedArchiveCode ? dataWithFormattedDate.filter((stat) => stat.archive.code === selectedArchiveCode) : [];

  return (
    <>
      <SelectArchive archives={archives} value={selectedArchiveCode} onChange={(val) => setSelectedArchiveCode(val?.toString())} />
      <div style={{ display: "grid", width: "100%", height: "100%" }}>
        <AgCharts
          options={{
            title: {
              text: filteredData[0]?.archive?.title || "Архів не вибрано",
            },
            data: [filteredData[0]],
            series: [
              {
                type: "bar",
                xKey: "created_at",
                yKey: "family_search_count",
                yName: "Family Search",
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "archium_count",
                yName: "ARCHIUM",
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "wikipedia_count",
                yName: "Wikipedia",
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "babyn_yar_count",
                yName: "Babyn Yar",
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "website_count",
                yName: "Website",
                stackGroup: "resources",
              },
            ],
          }}
        />
      </div>
    </>
  );
};

export default DuckChart;
