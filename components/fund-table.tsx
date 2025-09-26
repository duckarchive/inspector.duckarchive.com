"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { sortByCode } from "@/lib/table";
import useFund from "@/hooks/useFund";
import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetFundResponse["descriptions"][number];

const Details: React.FC<{
  fund?: GetFundResponse;
}> = ({ fund }) => (
  <div className="text-sm text-gray-500">
    {fund?.info && <p>{fund.info}</p>}
    {fund?.years.length ? (
      <ul className="list-disc list-inside py-2">
        <li>
          Роки: {getYearsString(fund.years)}
        </li>
      </ul>
    ) : null}
  </div>
);

interface FundTableProps {
  resources: Resources;
}

const FundTable: React.FC<FundTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const code = params["fund-code"];
  const isMobile = useIsMobile();
  const { fund, isLoading } = useFund(archiveCode, code);

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} фонд`}
        breadcrumbs={[archiveCode, code]}
        description={fund?.title || "Без назви"}
        message={<Details fund={fund} />}
      />
      <InspectorDuckTable<TableItem>
        resources={resources}
        isLoading={isLoading}
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
        rows={fund?.descriptions?.sort(sortByCode) || []}
      />
    </>
  );
};

export default FundTable;
