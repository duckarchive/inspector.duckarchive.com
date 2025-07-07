"use client";

import { Link } from "@heroui/link";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { DGSArchiveListItem } from "@/data/dgs-archive-list";
import { DuckTable } from "@duckarchive/framework";
import { Button, ButtonGroup } from "@heroui/button";
import { FaDownload } from "react-icons/fa";
import { DELIMITER } from "@/app/iframe/family-search-dgs-list/[archive-code]/page";

type TableItem = DGSArchiveListItem;
type DownloadItem = {
  dgs: string | null;
  full_code: string | null;
}

interface DGSArchiveTableProps {
  updatedAt: string;
  items: TableItem[];
}

const prepareToDownload = (items: TableItem[]): DownloadItem[] => {
  return items.map((item) => ({
    dgs: item.api_params,
    full_code: item.full_code,
  }));
};

const DGSArchiveTable: React.FC<DGSArchiveTableProps> = ({ items, updatedAt }) => {
  const params = useCyrillicParams();
  const [code, pagination] = params["archive-code"].split(DELIMITER);

  const handleDownloadJsonClick = () => {
    const jsonData = JSON.stringify(prepareToDownload(items), null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadCsvClick = () => {
    if (items.length === 0) return;
    const _items = prepareToDownload(items);
    // Get headers from the first object
    const headers = Object.keys(_items[0]);

    // Create CSV header row
    const csvHeader = headers.join(",");

    // Create CSV data rows
    const csvRows = _items.map((item) =>
      headers
        .map((header) => {
          const value = item[header as keyof DownloadItem] || "";
          // Escape commas and quotes in CSV values
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DGS ${code}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const [page, total] = pagination.split('-');

  return (
    <>
      <PagePanel title={`Список DGS кодів на сайті Family Search до справ ${code} (сторінка ${page} з ${total})`} description={`від ${updatedAt}`}>
        <ButtonGroup>
          <Button size="sm" variant="bordered" color="primary" onPress={handleDownloadJsonClick}>
            JSON
          </Button>
          <Button size="sm" variant="bordered" color="primary" endContent={<FaDownload />} onPress={handleDownloadCsvClick}>
            CSV
          </Button>
        </ButtonGroup>
      </PagePanel>
      <DuckTable<TableItem>
        appTheme={"light"}
        filters={[]}
        activeFilterId={""}
        setActiveFilterId={() => {}}
        columns={[
          {
            field: "api_params",
            headerName: "DGS",
            flex: 2,
            minWidth: 120,
            cellRenderer: (row: { value: number; data: TableItem }) =>
              row.data.full_code && row.data.url ? (
                <Link href={row.data.url} target="_blank" className="text-md">
                  {row.value}
                </Link>
              ) : (
                row.value
              ),
          },
          {
            field: "full_code",
            headerName: "Реквізити",
            filter: true,
            flex: 8,
            cellRenderer: (row: { value: number; data: TableItem }) =>
              row.value ? (
                <Link href={`/search?q=${row.value}`} target="_blank" className="text-md">
                  {row.value}
                </Link>
              ) : (
                "Не визначено/Справа не доступна"
              ),
          },
        ]}
        rows={items}
      />
    </>
  );
};

export default DGSArchiveTable;
