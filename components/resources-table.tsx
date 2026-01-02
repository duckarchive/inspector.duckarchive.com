"use client";

import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import ResourceBadge from "./resource-badge";
import { Resource } from "@/generated/prisma/client";
import { Link } from "@heroui/link";

type TableItem = Resources[number];

interface ResourceTableProps {
  resources: Resources;
}

const ResourceTable: React.FC<ResourceTableProps> = ({ resources }) => {
  return (
    <InspectorDuckTable<TableItem>
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
            <Link href={row.data.url || ""} isExternal>
              {row.value || "Без назви"}
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
