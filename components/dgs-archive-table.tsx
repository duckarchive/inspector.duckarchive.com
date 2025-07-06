"use client";

import { Link } from "@heroui/link";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { DGSArchiveListItem } from "@/data/dgs-archive-list";
import { DuckTable } from "@duckarchive/framework";

type TableItem = DGSArchiveListItem;

interface ArchiveTableProps {
  items: TableItem[];
}

const DGSArchiveTable: React.FC<ArchiveTableProps> = ({ items }) => {
  const params = useCyrillicParams();
  const code = params["archive-code"];

  return (
    <>
      <PagePanel title={`Список DGS кодів на сайті Family Search до справ ${code}`} />
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
