"use client";

import { Link } from "@heroui/react";
import NextLink from "next/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import ReportButton from "./report-button";
import CsvDownloadButton from "./csv-download-button";
import { sortByCode } from "@/lib/table";
import useInventory from "@/hooks/useInventory";
import { GetInventoryResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/route";
import { getYearsString } from "@/lib/text";
import { editorInventoryHref } from "@/lib/editor-links";
import { catalogItemLabel } from "@/lib/catalog-links";

type TableItem = GetInventoryResponse["files"][number];

const prepareToDownload = (items: TableItem[]) =>
  items.map((item) => ({
    code: item.code,
    title: item.title,
    years: getYearsString(item.years),
  }));

const Details: React.FC<{
  inventory?: GetInventoryResponse;
}> = ({ inventory }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {inventory?.years.length || inventory?.online_copies?.length ? (
      <ul className="list-inside py-2">
        {Boolean(inventory.years.length) && (
          <li>
            Роки:&nbsp;<span className="text-foreground">{getYearsString(inventory.years)}</span>
          </li>
        )}
        {(inventory.online_copies.filter((copy) => copy.url) as { url: string }[]).map((copy) => (
          <li key={copy.url}>
            <Link
              href={copy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground text-sm underline"
            >
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
  isAdmin?: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ resources, isAdmin }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fondCode = params["fond-code"];
  const code = params["inventory-code"];
  const isMobile = useIsMobile();
  const { inventory, isLoading, page } = useInventory(archiveCode, fondCode, code);
  const files = inventory?.files?.sort(sortByCode) || [];

  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        code={`${code} опис`}
        breadcrumbs={[archiveCode, fondCode, code]}
        title={inventory?.title || undefined}
        description={inventory?.info || undefined}
        message={<Details inventory={inventory} />}
      >
        <CsvDownloadButton
          filename={catalogItemLabel([archiveCode, fondCode, code])}
          rows={prepareToDownload(files)}
          isDisabled={isLoading}
        />
        <ReportButton
          entity="inventory"
          targetId={inventory?.id}
          current={{
            title: inventory?.title ?? null,
            info: inventory?.info ?? null,
            years: inventory?.years?.map(({ start_year, end_year }) => ({ start_year, end_year })) ?? [],
            codes: { archive: archiveCode, fond: fondCode, inventory: code },
            onlineCopies: inventory?.online_copies?.map(({ id, url }) => ({ id, url })) ?? [],
          }}
          editorHref={
            isAdmin && inventory?.id ? editorInventoryHref(archiveCode, inventory.fond_id, inventory.id) : undefined
          }
        />
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
              <NextLink href={`/archives/${archiveCode}/${fondCode}/${code}/${row.data.code}`} className="link">
                {row.value || `Справа ${row.data.code}`}
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
        rows={files}
      />
    </>
  );
};

export default InventoryTable;
