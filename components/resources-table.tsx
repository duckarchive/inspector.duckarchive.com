"use client";

import { ResourcesWithCounts } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import ResourceBadge from "./resource-badge";
import OnlineCopiesMeter from "./online-copies-meter";
import { Resource } from "@generated/prisma/client/client";
import { Link } from "@heroui/react";
import useIsMobile from "@/hooks/useIsMobile";
import { useTranslations } from "next-intl";

type TableItem = ResourcesWithCounts[number];

interface ResourceTableProps {
  resources: ResourcesWithCounts;
}

const totalCopies = (item?: TableItem) =>
  item ? item._count.public + item._count.restricted + item._count.paywall + item._count.unknown : 0;

const ResourceTable: React.FC<ResourceTableProps> = ({ resources }) => {
  const t = useTranslations("resources-page");
  const tCatalog = useTranslations("catalog");
  const isMobile = useIsMobile();
  return (
    <InspectorDuckTable<TableItem>
      id="resources-table"
      resources={resources}
      columns={[
        {
          field: "id",
          headerName: t("type-header"),
          flex: 0,
          width: 160,
          minWidth: 100,
          comparator: undefined,
          cellRenderer: (row: { value: Resource["id"] }) => (
            <ResourceBadge resourceId={row.value} resources={resources} />
          ),
          hide: isMobile,
          filter: false,
          type: "resource",
        },
        {
          field: "title",
          headerName: tCatalog("title-header"),
          flex: 4,
          cellRenderer: (row: { value: string; data: TableItem }) => (
            <Link href={row.data.url || ""} target="_blank" rel="noopener noreferrer">
              {row.value || tCatalog("no-title")}
              <Link.Icon />
            </Link>
          ),
          filter: true,
        },
        {
          field: "_count.public",
          flex: 0,
          width: 120,
          minWidth: 100,
          headerName: t("copies-header"),
          comparator: (_a, _b, nodeA, nodeB) => totalCopies(nodeA.data) - totalCopies(nodeB.data),
          cellRenderer: (row: { data: TableItem }) => <OnlineCopiesMeter counts={row.data._count} />,
        },
      ]}
      rows={Object.values(resources).sort((a, b) => totalCopies(b) - totalCopies(a))}
    />
  );
};

export default ResourceTable;
