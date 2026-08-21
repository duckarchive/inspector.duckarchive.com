"use client";

import { ResourcesWithCounts } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import ResourceBadge from "./resource-badge";
import { Resource } from "@generated/prisma/client/client";
import { Link } from "@heroui/react";

type TableItem = ResourcesWithCounts[number];

interface ResourceTableProps {
  resources: ResourcesWithCounts;
}

const ResourceTable: React.FC<ResourceTableProps> = ({ resources }) => {
  return (
    <InspectorDuckTable<TableItem>
      id="resources-table"
      resources={resources}
      columns={[
        {
          field: "id",
          headerName: "Тип",
          flex: 1.5,
          comparator: undefined,
          cellRenderer: (row: { value: Resource["id"] }) => (
            <ResourceBadge resourceId={row.value} resources={resources} />
          ),
          filter: false,
          type: "resource",
        },
        {
          field: "title",
          headerName: "Назва",
          flex: 8,
          cellRenderer: (row: { value: string; data: TableItem }) => (
            <Link href={row.data.url || ""} target="_blank" rel="noopener noreferrer">
              {row.value || "Без назви"}
              <Link.Icon />
            </Link>
          ),
          filter: true,
        },
        {
          field: "_count.online_copies",
          flex: 2,
          headerName: "Справ онлайн",
          comparator: undefined,
          cellRenderer: undefined,
        },
      ]}
      rows={Object.values(resources).sort((a, b) => b._count.online_copies - a._count.online_copies)}
    />
  );
};

export default ResourceTable;
