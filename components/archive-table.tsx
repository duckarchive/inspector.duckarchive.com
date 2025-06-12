"use client";

import { Archives } from "@/data/archives";
import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import useArchive from "@/hooks/useArchive";
import { sortByCode } from "@/lib/table";

type TableItem = Archives[number];

interface ArchiveTableProps {
  resources: Resources;
}

const ArchiveTable: React.FC<ArchiveTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const code = params["archive-code"];
  const isMobile = useIsMobile();
  const { archive, isLoading } = useArchive(code);

  return (
    <>
      <PagePanel title={`${code} архів`} breadcrumbs={[code]} description={archive?.title || "Без назви"} />
      <InspectorDuckTable<TableItem>
        resources={resources}
        isLoading={isLoading}
        isFiltersEnabled
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва фонду",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/archives/${code}/${row.data.code}`}>{row.value || `Фонд ${row.data.code}`}</Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Описи",
            hide: isMobile,
          },
        ]}
        rows={archive?.funds?.sort(sortByCode) || []}
      />
    </>
  );
};

export default ArchiveTable;
