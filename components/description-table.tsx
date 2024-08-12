"use client";

import { Archives } from "@/data/archives";
import { Link } from "@nextui-org/link";
import { Resources } from "@/data/resources";
import DuckTable from "@/components/duck-table";
import useIsMobile from "../hooks/useIsMobile";
import useCyrillicParams from "../hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { sortByCode } from "../lib/table";
import Loader from "./loader";
import useDescription from "../hooks/useDescription";
import { GetDescriptionResponse } from "../pages/api/archives/[archive-code]/[fund-code]/[description-code]";

type TableItem = GetDescriptionResponse["cases"][number];

interface DescriptionTableProps {
  resources: Resources;
}

const DescriptionTable: React.FC<DescriptionTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const code = params["description-code"];
  const isMobile = useIsMobile();
  const { description, isLoading } = useDescription(archiveCode, fundCode, code);

  if (isLoading) return <Loader />
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel title="Опис" description={description?.title || "Без назви"} />
      <DuckTable<TableItem>
        resources={resources}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/archives/${archiveCode}/${fundCode}/${code}/${row.data.code}`}>
                {row.value || `Опис ${row.data.code}`}
              </Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Справи",
            hide: isMobile,
          },
        ]}
        rows={description?.cases.sort(sortByCode) || []}
      />
    </>
  );
};

export default DescriptionTable;
