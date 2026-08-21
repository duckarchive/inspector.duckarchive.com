"use client";

import { Archives } from "@/data/archives";
import NextLink from "next/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import { sortByTitle } from "@/lib/table";
import useIsMobile from "@/hooks/useIsMobile";
import { sortText } from "@duckarchive/framework";

type TableItem = Archives[number];

interface ArchivesTableProps {
  resources: Resources;
  archives: Archives;
}

const ArchivesTable: React.FC<ArchivesTableProps> = ({ resources, archives }) => {
  const isMobile = useIsMobile();

  return (
    <InspectorDuckTable<TableItem>
      id="archives-table"
      resources={resources}
      columns={[
        {
          field: "code",
          sortable: false,
        },
        {
          field: "title",
          headerName: "Назва",
          flex: isMobile ? 4 : 9,
          filter: true,
          comparator: sortText,
          cellRenderer: (row: { value: number; data: TableItem }) => (
            <NextLink href={`/archives/${row.data.code}`} className="link">
              {row.value || `${row.data.code}`}
            </NextLink>
          ),
        },
      ]}
      rows={archives?.sort(sortByTitle) || []}
    />
  );
};

export default ArchivesTable;
