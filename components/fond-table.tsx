"use client";

import NextLink from "next/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import ReportButton from "./report-button";
import CsvDownloadButton from "./csv-download-button";
import { sortByCode } from "@/lib/table";
import useFond from "@/hooks/useFond";
import { GetFondResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/route";
import { getYearsString } from "@/lib/text";
import { editorFondHref } from "@/lib/editor-links";
import { catalogItemLabel } from "@/lib/catalog-links";

type TableItem = GetFondResponse["inventories"][number];

const prepareToDownload = (items: TableItem[]) =>
  items.map((item) => ({
    code: item.code,
    title: item.title,
    years: getYearsString(item.years),
  }));

const Details: React.FC<{
  fond?: GetFondResponse;
}> = ({ fond }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {fond?.years.length ? (
      <ul className="list-inside py-2">
        {fond?.years.length ? (
          <li>
            Роки:&nbsp;<span className="text-foreground">{getYearsString(fond.years)}</span>
          </li>
        ) : null}
      </ul>
    ) : null}
  </div>
);

interface FondTableProps {
  resources: Resources;
  isAdmin?: boolean;
}

const FondTable: React.FC<FondTableProps> = ({ resources, isAdmin }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const code = params["fond-code"];
  const isMobile = useIsMobile();
  const { fond, isLoading } = useFond(archiveCode, code);
  const inventories = fond?.inventories?.sort(sortByCode) || [];

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        code={`${code} фонд`}
        breadcrumbs={[archiveCode, code]}
        title={fond?.title || undefined}
        description={fond?.info || undefined}
        message={<Details fond={fond} />}
      >
        <CsvDownloadButton
          filename={catalogItemLabel([archiveCode, code])}
          rows={prepareToDownload(inventories)}
          isDisabled={isLoading}
        />
        <ReportButton
          entity="fond"
          targetId={fond?.id}
          editorHref={isAdmin && fond?.id ? editorFondHref(archiveCode, fond.id) : undefined}
        />
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
              <NextLink href={`/archives/${archiveCode}/${code}/${row.data.code}`} className="link">
                {row.value || `Опис ${row.data.code}`}
              </NextLink>
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
        rows={inventories}
      />
    </>
  );
};

export default FondTable;
