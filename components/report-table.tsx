"use client";

import { Report } from "@/data/report";
import { Link } from "@nextui-org/link";
import { Resources } from "@/data/resources";
import DuckTable from "@/components/duck-table";
import { getSyncAtLabel } from "@/lib/table";
import ResourceBadge from "./resource-badge";
import useNoRussians from "../hooks/useNoRussians";

type TableItem = Report[number];

interface ReportTableProps {
  resources: Resources;
  report: Report;
}

const ReportTable: React.FC<ReportTableProps> = ({ resources, report }) => {
  useNoRussians();
  return (
    <DuckTable<TableItem>
      resources={resources}
      columns={[
        {
          field: "resource_id",
          headerName: "Ресурс",
          flex: 1,
          sortable: false,
          filter: false,
          cellRenderer: (row: { value: TableItem["resource_id"]; data: TableItem }) => (    
            <div className="flex h-10 items-center justify-end gap-1 flex-wrap">
              <ResourceBadge resourceId={row.value} resources={resources} tooltip={getSyncAtLabel(row.data.updated_at)} />
            </div>
          ),
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
          sortable: false,
          cellRenderer: (row: { value: string; data: TableItem }) => (
            <Link href={row.value || "#"} isExternal>
              {row.value || "Щось пішло не так"}
            </Link>
          ),
        },
      ]}
      rows={report}
    />
  );
};

export default ReportTable;
