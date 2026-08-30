"use client";

import { Report } from "@/data/report";
import { Link } from "@heroui/react";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import { getSyncAtLabel } from "@/lib/table";
import ResourceBadge from "./resource-badge";
import { sortCode } from "@duckarchive/framework";
import { useLocale, useTranslations } from "next-intl";

type TableItem = Report[number];

interface ReportTableProps {
  resources: Resources;
  report: Report;
}

const ReportTable: React.FC<ReportTableProps> = ({ resources, report }) => {
  const t = useTranslations("report-table");
  const tTable = useTranslations("table");
  const locale = useLocale();
  return (
    <InspectorDuckTable<TableItem>
      id="report-table"
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
              <ResourceBadge resourceId={row.value} resources={resources} tooltip={getSyncAtLabel(row.data.updated_at, { locale, prefix: tTable("checked-prefix"), notSynced: tTable("not-synced") })}>
                &nbsp;
              </ResourceBadge>
            </div>
          ),
        },
        {
          field: "archive_code",
          headerName: t("archive-header"),
          filter: true,
          flex: 1,
          cellRenderer: (row: { value: TableItem["archive_code"]; data: TableItem }) => (
            <Link href={`/archives/${row.data.archive_code}`} className="text-inherit text-sm" target="_blank" rel="noopener noreferrer">
              {row.value}
            </Link>
          ),
        },
        {
          field: "fund_code",
          headerName: t("fond-header"),
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["fund_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}`}
              className="text-inherit text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.value}
            </Link>
          ),
        },
        {
          field: "description_code",
          headerName: t("inventory-header"),
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["description_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}`}
              className="text-inherit text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.value}
            </Link>
          ),
        },
        {
          field: "case_code",
          headerName: t("file-header"),
          filter: true,
          flex: 1,
          comparator: sortCode,
          cellRenderer: (row: { value: TableItem["case_code"]; data: TableItem }) => (
            <Link
              href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}/${row.data.case_code}`}
              className="text-inherit text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.value}
            </Link>
          ),
        },
        {
          field: "url",
          headerName: t("url-header"),
          flex: 4,
          sortable: false,
          cellRenderer: (row: { value: string; data: TableItem }) => (
            <Link href={row.value || "#"} target="_blank" rel="noopener noreferrer">
              {row.value || t("broken-link")}
              <Link.Icon />
            </Link>
          ),
        },
      ]}
      rows={report}
    />
  );
};

export default ReportTable;
