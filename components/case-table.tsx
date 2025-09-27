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
import useCase from "@/hooks/useCase";
import ResourceBadge from "./resource-badge";
import { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";
import { getYearsString } from "@/lib/text";
import dynamic from "next/dynamic";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

type TableItem = GetCaseResponse["matches"][number];

const Details: React.FC<{
  caseItem?: GetCaseResponse;
}> = ({ caseItem }) => (
  <div className="text-sm text-gray-500 max-h-[200px] md:max-h-[320px] overflow-y-auto">
    {caseItem?.info && <p>{caseItem.info}</p>}
    {caseItem?.years.length || caseItem?.locations?.length ? (
      <div className="flex flex-col md:flex-row justify-between py-2 gap-4">
        {Boolean(caseItem.locations.length) && (
          <div className="h-64 grow">
            <GeoDuckMap
              key="static-geoduck-map"
              className="rounded-lg text-primary"
              center={[caseItem.locations[0].lat, caseItem.locations[0].lng]}
              positions={caseItem.locations.map((loc) => [loc.lat, loc.lng, loc.radius_m])}
              year={caseItem.years[0].start_year || undefined}
              hideLayers={{ searchInput: true, historicalLayers: true }}
              zoom={12}
              scrollWheelZoom
              dragging
            />
          </div>
        )}
        <ul className="list-disc list-inside basis-1/2">
          {Boolean(caseItem.years.length) && (
            <li>
              Рік: <span className="text-primary">{getYearsString(caseItem.years)}</span>
            </li>
          )}
          {Boolean(caseItem.authors.length) && (
            <li>
              Автори:&nbsp;
              {caseItem.authors.map(({ author }, index) => (
                <span key={author.id}>
                  {index > 0 && ", "}
                  <span className="text-primary">{author.title} ({author.info})</span>
                </span>
              ))}
            </li>
          )}
          {Boolean(caseItem.tags.length) && (
            <li>
              Теги:&nbsp;
              {caseItem.tags.map((tag, index) => (
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

interface CaseTableProps {
  resources: Resources;
}

const CaseTable: React.FC<CaseTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const code = params["case-code"];
  const isMobile = useIsMobile();
  const { caseItem, isLoading } = useCase(archiveCode, fundCode, descriptionCode, code);

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} справа`}
        breadcrumbs={[archiveCode, fundCode, descriptionCode, code]}
        description={caseItem?.title || "Без назви"}
        message={<Details caseItem={caseItem} />}
      />
      <InspectorDuckTable<TableItem>
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
        rows={caseItem?.matches || []}
      />
    </>
  );
};

export default CaseTable;
