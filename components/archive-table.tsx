"use client";

import { Link } from "@heroui/react";
import NextLink from "next/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import useArchive from "@/hooks/useArchive";
import { sortByCode } from "@/lib/table";
import { GetCatalogArchiveResponse } from "@/app/api/catalog/[archive-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetCatalogArchiveResponse["fonds"][number];

const Details: React.FC<{
  archive?: GetCatalogArchiveResponse;
}> = ({ archive }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto mb-4">
    {archive?.url || archive?.address || archive?.phone_number || archive?.email ? (
      <ul className="list-inside">
        {archive.address && (
          <li>
            Адреса:&nbsp;
            <Link
              href={`https://www.google.com/maps/place/${archive.address.split(/,?\s+/).join("+")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {archive.address}
            </Link>
          </li>
        )}
        {archive.url && (
          <li>
            Офіційний сайт:&nbsp;
            <Link href={archive.url} target="_blank">
              {archive.url}
            </Link>
          </li>
        )}
        {archive.phone_number && (
          <li>
            Телефон:&nbsp;
            <Link href={`tel:${archive.phone_number}`}>
              {archive.phone_number}
            </Link>
          </li>
        )}
        {archive.email && (
          <li>
            Email:&nbsp;
            <Link href={`mailto:${archive.email}`}>
              {archive.email}
            </Link>
          </li>
        )}
      </ul>
    ) : null}
  </div>
);

interface ArchiveTableProps {
  resources?: Resources;
}

const ArchiveTable: React.FC<ArchiveTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const code = params["archive-code"];
  const isMobile = useIsMobile();
  const { archive, isLoading } = useArchive(code);

  return (
    <>
      <PagePanel
        code={`${code} архів`}
        breadcrumbs={[code]}
        title={archive?.title || undefined}
        description={archive?.info || undefined}
        message={<Details archive={archive} />}
      />
      <InspectorDuckTable<TableItem>
        id="archive-table"
        resources={resources}
        isLoading={isLoading}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва фонду",
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <NextLink href={`/archives/${code}/${row.data.code}`} className="link">
                {row.value || `Фонд ${row.data.code}`}
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
        rows={archive?.fonds?.sort(sortByCode) || []}
      />
    </>
  );
};

export default ArchiveTable;
