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
import { GetFileResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/route";
import { getYearsString } from "@/lib/text";
import { editorFileHref } from "@/lib/editor-links";
import { catalogItemLabel } from "@/lib/catalog-links";
import dynamic from "next/dynamic";
import { findCenter, prepareLocations } from "@/lib/map";

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

const Details: React.FC<{
  file?: GetFileResponse;
}> = ({ file }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {file?.years?.length || file?.locations?.length || file?.authors?.length ? (
      <div className="flex flex-col md:flex-row justify-between py-2 gap-4">
        {Boolean(
          [...file.locations, ...file.authors.map(({ author }) => author)].some(
            (loc) => loc.lat !== null && loc.lng !== null,
          ),
        ) && (
          <div className="h-64 grow">
            <GeoDuckMap
              key="static-geoduck-map"
              className="rounded-lg text-accent"
              center={findCenter([...file.locations, ...file.authors.map(({ author }) => author)])}
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
              Рік: <span className="text-foreground">{getYearsString(file.years)}</span>
            </li>
          )}
          {Boolean(file.authors.length) && (
            <li>
              Автори:&nbsp;
              {file.authors.map(({ author }, index) => (
                <span key={author.id}>
                  {index > 0 && ", "}
                  <span className="text-foreground">
                    {author.title}{author.info ? ` (${author.info})` : ""}
                  </span>
                </span>
              ))}
            </li>
          )}
          {Boolean(file.tags.length) && (
            <li>
              Теги:&nbsp;
              {file.tags.map((tag, index) => (
                <span key={tag}>
                  {index > 0 && ", "}
                  <span className="text-foreground">{tag}</span>
                </span>
              ))}
            </li>
          )}
        </ul>
      </div>
    ) : null}
  </div>
);

interface FileTableProps {
  resources: Resources;
  isAdmin?: boolean;
}

const FileTable: React.FC<FileTableProps> = ({ resources, isAdmin }) => {
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
        code={`${code} справа`}
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
          editorHref={isAdmin && file?.id ? editorFileHref(archiveCode, file.inventory.fond_id, file.inventory_id, file.id) : undefined}
        />
      </PagePanel>
      <InspectorDuckTable<TableItem>
        id="file-table"
        resources={resources}
        isLoading={isLoading}
        columns={[
          {
            field: "resource_id",
            headerName: "Ресурс",
            flex: 1.5,
            hide: isMobile,
            cellRenderer: (row: { value: TableItem["resource_id"] }) => (
              <ResourceBadge resources={resources} resourceId={row.value} />
            ),
          },
          {
            field: "url",
            headerName: "Посилання",
            flex: isMobile ? 4 : 9,
            resizable: !isMobile,
            filter: true,
            cellRenderer: (row: { value: string; data: TableItem }) =>
              row.data.availability === Availability.PUBLIC ? (
                <Link href={row.value} target="_blank" rel="noopener noreferrer">
                  {row.value || "Без назви"}
                  <Link.Icon />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 opacity-50">
                  <FaLock />
                  {row.value || "Без назви"}
                </span>
              ),
          },
          {
            field: "checked_availability_at",
            headerName: "Перевірено",
            flex: 2,
            hide: isMobile,
            cellRenderer: (row: { value: string; data: TableItem }) => getSyncAtLabel(row.value, true),
            comparator: undefined,
          },
        ]}
        rows={file?.online_copies || []}
      />
    </>
  );
};

export default FileTable;
