"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import ReportButton from "./report-button";
import { sortByCode } from "@/lib/table";
import useInventory from "@/hooks/useInventory";
import { GetInventoryResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetInventoryResponse["files"][number];

const Details: React.FC<{
  inventory?: GetInventoryResponse;
}> = ({ inventory }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {inventory?.info && <p>{inventory.info}</p>}
    {inventory?.years.length || inventory?.online_copies?.length ? (
      <ul className="list-disc list-inside py-2">
        {Boolean(inventory.years.length) && <li>Роки: {getYearsString(inventory.years)}</li>}
        {(inventory.online_copies.filter((copy) => copy.url) as { url: string }[]).map((copy) => (
          <li key={copy.url}>
            <Link href={copy.url} target="_blank" className="text-inherit text-sm underline">
              {copy.url}
            </Link>
          </li>
        ))}
      </ul>
    ) : null}
  </div>
);

interface InventoryTableProps {
  resources: Resources;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fondCode = params["fond-code"];
  const code = params["inventory-code"];
  const isMobile = useIsMobile();
  const { inventory, isLoading, page } = useInventory(archiveCode, fondCode, code);

  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} опис`}
        breadcrumbs={[archiveCode, fondCode, code]}
        basePath="/catalog/"
        description={inventory?.title || "Без назви"}
        message={<Details inventory={inventory} />}
      >
        <ReportButton entity="inventory" targetId={inventory?.id} />
      </PagePanel>
      <InspectorDuckTable<TableItem>
        id="inventory-table"
        resources={resources}
        isLoading={isLoading}
        loadingPage={page}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва справи",
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/catalog/${archiveCode}/${fondCode}/${code}/${row.data.code}`}>
                {row.value || `Справа ${row.data.code}`}
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
        rows={inventory?.files?.sort(sortByCode) || []}
      />
    </>
  );
};

export default InventoryTable;
