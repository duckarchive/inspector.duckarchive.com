"use client";

import { Resources } from "@/data/resources";
import DuckTable from "@/components/duck-table";
import ResourceBadge from "./resource-badge";
import { Resource } from "@prisma/client";
import { Link } from "@heroui/link";

type TableItem = Resources[number];

interface ResourceTableProps {
  resources: Resources;
}

const ResourceTable: React.FC<ResourceTableProps> = ({ resources }) => {
  return (
    <DuckTable<TableItem>
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
          field: "_count.matches",
          flex: 2,
          headerName: "Справ онлайн",
          comparator: undefined,
          cellRenderer: undefined,
        },
      ]}
      rows={Object.values(resources).sort(
        (a, b) => b._count.matches - a._count.matches
      )}
    />
  );
};

export default ResourceTable;
