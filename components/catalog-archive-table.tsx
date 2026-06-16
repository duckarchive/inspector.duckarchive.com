"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import useCatalogArchive from "@/hooks/useCatalogArchive";
import { sortByCode } from "@/lib/table";
import { GetCatalogArchiveResponse } from "@/app/api/catalog/[archive-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetCatalogArchiveResponse["fonds"][number];

const Details: React.FC<{
  archive?: GetCatalogArchiveResponse;
}> = ({ archive }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {archive?.info && <p>{archive.info}</p>}
    {archive?.url || archive?.address || archive?.phone_number || archive?.email ? (
      <ul className="list-disc list-inside py-2">
        {archive.address && (
          <li>
            Адреса:&nbsp;
            <Link
              href={`https://www.google.com/maps/place/${archive.address.split(/,?\s+/).join("+")}`}
              target="_blank"
              className="text-primary text-sm"
            >
              {archive.address}
            </Link>
          </li>
        )}
        {archive.url && (
          <li>
            Офіційний сайт:&nbsp;
            <Link href={archive.url} target="_blank" className="text-primary text-sm">
              {archive.url}
            </Link>
          </li>
        )}
        {archive.phone_number && (
          <li>
            Телефон:&nbsp;
            <Link href={`tel:${archive.phone_number}`} className="text-primary text-sm">
              {archive.phone_number}
            </Link>
          </li>
        )}
        {archive.email && (
          <li>
            Email:&nbsp;
            <Link href={`mailto:${archive.email}`} className="text-primary text-sm">
              {archive.email}
            </Link>
          </li>
        )}
      </ul>
    ) : null}
  </div>
);

interface CatalogArchiveTableProps {
  resources: Resources;
}

const CatalogArchiveTable: React.FC<CatalogArchiveTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const code = params["archive-code"];
  const isMobile = useIsMobile();
  const { archive, isLoading } = useCatalogArchive(code);

  return (
    <>
      <PagePanel
        title={`${code} архів`}
        breadcrumbs={[code]}
        basePath="/catalog/"
        description={archive?.title || "Без назви"}
        message={<Details archive={archive} />}
      />
      <InspectorDuckTable<TableItem>
        id="catalog-archive-table"
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
              <Link href={`/catalog/${code}/${row.data.code}`}>{row.value || `Фонд ${row.data.code}`}</Link>
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

export default CatalogArchiveTable;
