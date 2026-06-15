// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { getSyncAtLabel } from "@/lib/table";
import useFile from "@/hooks/useFile";
import ResourceBadge from "./resource-badge";
import { GetFileResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/route";
import { getYearsString } from "@/lib/text";
import dynamic from "next/dynamic";
import { findCenter, prepareLocations } from "@/lib/map";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

type TableItem = GetFileResponse["online_copies"][number];

const Details: React.FC<{
  file?: GetFileResponse;
}> = ({ file }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {file?.info && <p>{file.info}</p>}
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
              className="rounded-lg text-primary"
              center={findCenter([...file.locations, ...file.authors.map(({ author }) => author)])}
              positions={prepareLocations([...file.locations, ...file.authors.map(({ author }) => author)])}
              year={file.years[0].start_year || undefined}
              hideLayers={{ searchInput: true, historicalLayers: true }}
              zoom={12}
              scrollWheelZoom
              dragging
            />
          </div>
        )}
        <ul className="list-disc list-inside basis-1/2">
          {Boolean(file.years.length) && (
            <li>
              Рік: <span className="text-primary">{getYearsString(file.years)}</span>
            </li>
          )}
          {Boolean(file.authors.length) && (
            <li>
              Автори:&nbsp;
              {file.authors.map(({ author }, index) => (
                <span key={author.id}>
                  {index > 0 && ", "}
                  <span className="text-primary">
                    {author.title} ({author.info})
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
                  <span className="text-primary">{tag}</span>
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
}

const FileTable: React.FC<FileTableProps> = ({ resources }) => {
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
        title={`${code} справа`}
        breadcrumbs={[archiveCode, fondCode, inventoryCode, code]}
        basePath="/catalog/"
        description={file?.title || "Без назви"}
        message={<Details file={file} />}
      />
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
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value} isExternal>
                {row.value || "Без назви"}
              </Link>
            ),
          },
          {
            field: "updated_at",
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
