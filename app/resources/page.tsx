"use client";

import React from "react";
import { useResources } from "../contexts/Resources";
import { GetAllResourcesResponse } from "../../pages/api/resources";
import DuckTable from "../components/Table";
import ResourceBadge from "../components/ResourceBadge";

type TableItem = GetAllResourcesResponse[number];

const AddMatch: React.FC = () => {
  const resources = useResources();

  return (
    <>
      <DuckTable<TableItem>
        columns={[
          {
            field: "id",
            headerName: "Тип",
            flex: 1.5,
            comparator: undefined,
            cellRenderer: (row: { value: TableItem["id"] }) => <ResourceBadge resourceId={row.value} />,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 8,
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
        rows={Object.values(resources)}
      />
    </>
  );
};

export default AddMatch;
