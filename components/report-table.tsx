"use client";

import { Report } from "@/data/report";
import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import DuckTable from "@/components/duck-table";
import { getSyncAtLabel, sortCode } from "@/lib/table";
import ResourceBadge from "./resource-badge";

type TableItem = Report[number];

interface ReportTableProps {
  resources: Resources;
  report: Report;
}

const ReportTable: React.FC<ReportTableProps> = ({ resources, report }) => {
  return (
    <DuckTable<TableItem>
      resources={resources}
      columns={[
        {
          field: "resource_id",
          headerName: "",
          flex: 0,
          width: 55,
          minWidth: 55,
          sortable: false,
          filter: false,
          cellRenderer: (row: { value: TableItem["resource_id"]; data: TableItem }) => (
            <div className="flex h-10 w-full items-center justify-center">
              <ResourceBadge
                resourceId={row.value}
                resources={resources}
                tooltip={getSyncAtLabel(row.data.updated_at)}
              >
                &nbsp;
              </ResourceBadge>
            </div>
          ),
        },
        {
          field: "archive_code",
          headerName: "Архів",
          filter: true,
          flex: 1,
          cellRenderer: (row: { value: TableItem["archive_code"]; data: TableItem }) => (
            <Link href={`/archives/${row.data.archive_code}`} className="text-inherit text-sm" target="_blank">
              {row.value}
            </Link>
          ),
        },
        {
          field: "fund_code",
          headerName: "Фонд",
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["fund_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}`}
              className="text-inherit text-sm"
              target="_blank"
            >
              {row.value}
            </Link>
          ),
        },
        {
          field: "description_code",
          headerName: "Опис",
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["description_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}`}
              className="text-inherit text-sm"
              target="_blank"
            >
              {row.value}
            </Link>
          ),
        },
        {
          field: "case_code",
          headerName: "Справа",
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["case_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}/${row.data.case_code}`}
              className="text-inherit text-sm"
              target="_blank"
            >
              {row.value}
            </Link>
          ),
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
