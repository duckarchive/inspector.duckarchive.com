"use client";

import { AgCharts } from "ag-charts-react";
import { DailyStatWithArchive } from "@/data/report";
import { useEffect, useState } from "react";
import { Archives } from "@/data/archives";
import SelectArchive from "./select-archive";
import { useTheme } from "next-themes";
import { TYPE_LABEL } from "./resource-badge";
import { ResourceType } from "@generated/prisma/client/enums";

interface DuckChartProps {
  archives: Archives;
  data: DailyStatWithArchive[];
}

const DuckChart: React.FC<DuckChartProps> = ({ data, archives }) => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const dataWithFormattedDate = data.map((stat) => ({
    ...stat,
    created_at: new Date(stat.created_at).toLocaleDateString("uk-UA"),
  }));
  const [selectedArchiveCode, setSelectedArchiveCode] = useState<string | undefined>("ЦДІАК");

  const filteredData = selectedArchiveCode
    ? dataWithFormattedDate.filter((stat) => stat.archive.code === selectedArchiveCode)
    : [];

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mt-4 h-full">
      <SelectArchive
        archives={archives}
        value={selectedArchiveCode}
        onChange={(val) => setSelectedArchiveCode(val?.toString())}
      />
      <div style={{ display: "grid", width: "100%", height: "100%" }}>
        <AgCharts
          options={{
            theme: {
              baseTheme: theme === "dark" ? "ag-default-dark" : "ag-default",
              palette: {
                fills: ["#17c964", "#f5a524", "#006FEE", "#71717a", "#7828c8"],
              },
            },
            title: {
              text: filteredData[0]?.archive?.title || "Архів не вибрано",
            },
            data: filteredData,
            series: [
              {
                type: "bar",
                xKey: "created_at",
                yKey: "family_search_count",
                yName: TYPE_LABEL[ResourceType.FAMILY_SEARCH],
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "archium_count",
                yName: TYPE_LABEL[ResourceType.ARCHIUM],
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "wikipedia_count",
                yName: TYPE_LABEL[ResourceType.WIKIPEDIA],
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "babyn_yar_count",
                yName: TYPE_LABEL[ResourceType.BABYN_YAR],
                stackGroup: "resources",
              },
              {
                type: "bar",
                xKey: "created_at",
                yKey: "website_count",
                yName: TYPE_LABEL[ResourceType.WEBSITE],
                stackGroup: "resources",
              },
            ],
          }}
        />
      </div>
    </div>
  );
};

export default DuckChart;
