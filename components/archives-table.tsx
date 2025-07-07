"use client";

import { Archives } from "@/data/archives";
import { Link } from "@heroui/link";
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
      resources={resources}
      columns={[
        {
          field: "code",
          sortable: false,
          hide: isMobile,
        },
        {
          field: "title",
          headerName: "Назва",
          flex: 9,
          filter: true,
          comparator: sortText,
          cellRenderer: (row: { value: number; data: TableItem }) => (
            <Link href={`archives/${row.data.code}`}>
              {row.value || `${row.data.code}`}
            </Link>
          ),

        },
        {
          colId: "sync",
          headerName: "Фонди",
          hide: isMobile,
        },
      ]}
      rows={archives?.sort(sortByTitle) || []}
    />
  );
};

export default ArchivesTable;
