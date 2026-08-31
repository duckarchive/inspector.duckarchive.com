// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import { Link } from "@heroui/react";
import { FaLock } from "react-icons/fa";
import { Availability } from "@/generated/prisma/client/enums";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import ReportButton from "./report-button";
import CsvDownloadButton from "./csv-download-button";
import { getSyncAtLabel } from "@/lib/table";
import useFile from "@/hooks/useFile";
import ResourceBadge, { TYPE_LABEL } from "./resource-badge";
import CollapsibleText from "./collapsible-text";
import { GetFileResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/route";
import { getYearsString } from "@/lib/text";
import { editorFileHref } from "@/lib/editor-links";
import { catalogItemLabel } from "@/lib/catalog-links";
import dynamic from "next/dynamic";
import qs from "qs";
import { useCallback, useMemo } from "react";
import type { Map as LeafletMap } from "leaflet";
import { findCenter, prepareLocations } from "@/lib/map";
import { useLocale, useTranslations } from "next-intl";
import TranslatableText from "./translatable-text";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

type TableItem = GetFileResponse["online_copies"][number];

const prepareToDownload = (copies: TableItem[], resources: Resources) =>
  copies.map((copy) => {
    const resourceType = copy.resource_id !== null ? resources[copy.resource_id]?.type : undefined;
    return {
      resource: (resourceType && TYPE_LABEL[resourceType]) || "",
      url: copy.url,
      availability: copy.availability,
      updated_at: copy.updated_at ? new Date(copy.updated_at).toISOString() : "",
    };
  });

/** New-tab link into the search page with the given prefilled criteria. */
const SearchLink: React.FC<React.PropsWithChildren<{ query: Record<string, unknown> }>> = ({ query, children }) => (
  <Link
    href={`/search?${qs.stringify(query, { skipNulls: true })}`}
    className="inline text-foreground"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </Link>
);

const Details: React.FC<{
  file?: GetFileResponse;
}> = ({ file }) => {
  const t = useTranslations("catalog");
  const tTags = useTranslations("tags");
  const geoPoints = useMemo(
    () =>
      [...(file?.locations ?? []), ...(file?.authors ?? []).map(({ author }) => author)].filter(
        (loc): loc is typeof loc & { lat: number; lng: number } => loc.lat !== null && loc.lng !== null,
      ),
    [file],
  );

  // Fit the initial view to every marker. A callback ref (instead of an effect)
  // because the map mounts late — dynamic import + client-only — and react-leaflet
  // invokes the ref once the Leaflet instance is actually ready.
  const fitMapToMarkers = useCallback(
    (map: LeafletMap | null) => {
      if (!map || geoPoints.length === 0) return;
      map.fitBounds(
        geoPoints.map((loc) => [loc.lat, loc.lng] as [number, number]),
        // maxZoom keeps a single marker from being zoomed to rooftop level
        { padding: [10, 10], maxZoom: 10 },
      );
    },
    [geoPoints],
  );

  return (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {file?.years?.length || file?.locations?.length || file?.authors?.length ? (
      <div className="flex flex-col md:flex-row justify-between py-2 gap-4">
        {Boolean(geoPoints.length) && (
          <div className="h-64 grow">
            <GeoDuckMap
              key="static-geoduck-map"
              ref={fitMapToMarkers}
              className="rounded-lg text-accent"
              center={findCenter(geoPoints)}
              positions={prepareLocations([...file.locations, ...file.authors.map(({ author }) => author)])}
              year={file.years[0]?.start_year || undefined}
              hideLayers={{ searchInput: true, historicalLayers: true }}
              zoom={12}
              scrollWheelZoom
              dragging
            />
          </div>
        )}
        <ul className="list-inside basis-1/2">
          {Boolean(file.years.length) && (
            <li>
              {t("year-label")}&nbsp;
              {file.years.filter(({ start_year, end_year }) => start_year || end_year).length ? (
                file.years
                  .filter(({ start_year, end_year }) => Boolean(start_year) || Boolean(end_year))
                  .map(({ start_year, end_year }, index) => (
                    <SearchLink
                      key={`${start_year}-${end_year}`}
                      query={{ year_from: start_year, year_to: end_year || start_year }}
                    >
                      {index > 0 && ", "}
                      {getYearsString([{ start_year, end_year }])}
                    </SearchLink>
                  ))
              ) : (
                <span className="text-foreground">{t("unknown")}</span>
              )}
            </li>
          )}
          {Boolean(file.authors.length) && (
            <li>
              <CollapsibleText>
                {t("authors-label")}&nbsp;
                {file.authors.map(({ author }, index) => (
                  <SearchLink key={author.id} query={{ author: author.title }}>
                    {index > 0 && ", "}
                    <TranslatableText>{author.title}</TranslatableText>
                  </SearchLink>
                ))}
              </CollapsibleText>
            </li>
          )}
          {Boolean(file.tags.length) && (
            <li>
              {t("tags-label")}&nbsp;
              {file.tags.map((tag, index) => (
                <SearchLink key={tag} query={{ tags: [tag] }}>
                  {index > 0 && ", "}
                  {tTags.has(tag) ? tTags(tag) : tag}
                </SearchLink>
              ))}
            </li>
          )}
        </ul>
      </div>
    ) : null}
  </div>
  );
};

interface FileTableProps {
  resources: Resources;
  isAdmin?: boolean;
}

const FileTable: React.FC<FileTableProps> = ({ resources, isAdmin }) => {
  const t = useTranslations("catalog");
  const tTable = useTranslations("table");
  const locale = useLocale();
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fondCode = params["fond-code"];
  const inventoryCode = params["inventory-code"];
  const code = params["file-code"];
  const isMobile = useIsMobile();
  const { file, isLoading } = useFile(archiveCode, fondCode, inventoryCode, code);

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        code={t("file-code-label", { code })}
        isTranslatable
        breadcrumbs={[archiveCode, fondCode, inventoryCode, code]}
        title={file?.title || undefined}
        description={file?.info || undefined}
        message={<Details file={file} />}
      >
        <CsvDownloadButton
          filename={catalogItemLabel([archiveCode, fondCode, inventoryCode, code])}
          rows={prepareToDownload(file?.online_copies || [], resources)}
          isDisabled={isLoading}
        />
        <ReportButton
          entity="file"
          targetId={file?.id}
          current={{
            title: file?.title ?? null,
            info: file?.info ?? null,
            years: file?.years?.map(({ start_year, end_year }) => ({ start_year, end_year })) ?? [],
            codes: { archive: archiveCode, fond: fondCode, inventory: inventoryCode, file: code },
            onlineCopies: file?.online_copies?.map(({ id, url }) => ({ id, url })) ?? [],
            authors: file?.authors?.map(({ author }) => ({ id: author.id, title: author.title })) ?? [],
          }}
          editorHref={
            isAdmin && file?.id
              ? editorFileHref(archiveCode, file.inventory.fond_id, file.inventory_id, file.id)
              : undefined
          }
        />
      </PagePanel>
      <InspectorDuckTable<TableItem>
        id="file-table"
        resources={resources}
        isLoading={isLoading}
        columns={[
          {
            field: "resource_id",
            headerName: t("resource-header"),
            flex: 1.5,
            hide: isMobile,
            cellRenderer: (row: { value: TableItem["resource_id"] }) => (
              <ResourceBadge resources={resources} resourceId={row.value} />
            ),
          },
          {
            field: "url",
            headerName: t("url-header"),
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: string; data: TableItem }) =>
              row.data.availability === Availability.PUBLIC ? (
                <Link href={row.value} target="_blank" rel="noopener noreferrer">
                  {row.value || t("no-title")}
                  <Link.Icon />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 opacity-50">
                  <FaLock />
                  {row.value || t("no-title")}
                </span>
              ),
          },
          {
            field: "checked_availability_at",
            headerName: t("checked-header"),
            flex: 2,
            hide: isMobile,
            cellRenderer: (row: { value: string; data: TableItem }) => getSyncAtLabel(row.value, { locale, notSynced: tTable("not-synced") }),
            comparator: undefined,
          },
        ]}
        rows={file?.online_copies || []}
      />
    </>
  );
};

export default FileTable;
