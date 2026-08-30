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
import { useTranslations } from "next-intl";

type TableItem = GetCatalogArchiveResponse["fonds"][number];

const Details: React.FC<{
  archive?: GetCatalogArchiveResponse;
}> = ({ archive }) => {
  const t = useTranslations("catalog");
  return (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto mb-4">
    {archive?.url || archive?.address || archive?.phone_number || archive?.email ? (
      <ul className="list-inside">
        {archive.address && (
          <li>
            {t("address-label")}&nbsp;
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
            {t("website-label")}&nbsp;
            <Link href={archive.url} target="_blank">
              {archive.url}
            </Link>
          </li>
        )}
        {archive.phone_number && (
          <li>
            {t("phone-label")}&nbsp;
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
};

interface ArchiveTableProps {
  resources?: Resources;
}

const ArchiveTable: React.FC<ArchiveTableProps> = ({ resources }) => {
  const t = useTranslations("catalog");
  const params = useCyrillicParams();
  const code = params["archive-code"];
  const isMobile = useIsMobile();
  const { archive, isLoading } = useArchive(code);

  return (
    <>
      <PagePanel
        code={t("archive-code-label", { code })}
        isTranslatable
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
            headerName: t("fond-title-header"),
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <NextLink href={`/archives/${code}/${row.data.code}`} className="link">
                {row.value || t("untitled-fond", { code: row.data.code })}
              </NextLink>
            ),
          },
          {
            field: "years",
            headerName: t("years-header"),
            valueGetter: (params) => (params.data ? getYearsString(params.data.years, t("unknown")) : ""),
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
