"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import ReportButton from "./report-button";
import { sortByCode } from "@/lib/table";
import useFond from "@/hooks/useFond";
import { GetFondResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetFondResponse["inventories"][number];

const Details: React.FC<{
  fond?: GetFondResponse;
}> = ({ fond }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {fond?.info && <p>{fond.info}</p>}
    {fond?.years.length ? (
      <ul className="list-disc list-inside py-2">
        {fond?.years.length ? <li>Роки: {getYearsString(fond.years)}</li> : null}
      </ul>
    ) : null}
  </div>
);

interface FondTableProps {
  resources: Resources;
}

const FondTable: React.FC<FondTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const code = params["fond-code"];
  const isMobile = useIsMobile();
  const { fond, isLoading } = useFond(archiveCode, code);

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} фонд`}
        breadcrumbs={[archiveCode, code]}
        basePath="/catalog/"
        description={fond?.title || "Без назви"}
        message={<Details fond={fond} />}
      >
        <ReportButton entity="fond" targetId={fond?.id} />
      </PagePanel>
      <InspectorDuckTable<TableItem>
        id="fond-table"
        resources={resources}
        isLoading={isLoading}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва опису",
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/catalog/${archiveCode}/${code}/${row.data.code}`}>
                {row.value || `Опис ${row.data.code}`}
              </Link>
            ),
          },
          {
            field: "years",
            headerName: "Роки",
            valueGetter: (params) => (params.data ? getYearsString(params.data.years) : ""),
            filter: true,
            hide: isMobile,
          },
        ]}
        rows={fond?.inventories?.sort(sortByCode) || []}
      />
    </>
  );
};

export default FondTable;
