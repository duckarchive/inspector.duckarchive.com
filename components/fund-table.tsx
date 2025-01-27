"use client";

import { Archives } from "@/data/archives";
import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import DuckTable from "@/components/duck-table";
import useIsMobile from "../hooks/useIsMobile";
import useCyrillicParams from "../hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { sortByCode } from "../lib/table";
import Loader from "./loader";
import useFund from "../hooks/useFund";
import { GetFundResponse } from "../pages/api/archives/[archive-code]/[fund-code]";
import useNoRussians from "../hooks/useNoRussians";

type TableItem = GetFundResponse["descriptions"][number];

interface FundTableProps {
  resources: Resources;
}

const FundTable: React.FC<FundTableProps> = ({ resources }) => {
  useNoRussians();
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const code = params["fund-code"];
  const isMobile = useIsMobile();
  const { fund, isLoading } = useFund(archiveCode, code);

  if (isLoading) return <Loader />
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel title={`Фонд ${code}`} description={fund?.title || "Без назви"} />
      <DuckTable<TableItem>
        resources={resources}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва опису",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/archives/${archiveCode}/${code}/${row.data.code}`}>
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
        rows={fund?.descriptions.sort(sortByCode) || []}
      />
    </>
  );
};

export default FundTable;
