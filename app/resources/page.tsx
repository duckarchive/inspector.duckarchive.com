"use client";

import React from "react";
import { useResources } from "../contexts/Resources";
import { GetAllResourcesResponse } from "../../pages/api/resources";
import DuckTable from "../components/Table";
import ResourceBadge from "../components/ResourceBadge";
import PagePanel from "../components/PagePanel";
import Loader from "../components/Loader";
import { isEmpty } from "lodash";

type TableItem = GetAllResourcesResponse[number];

const ResourcesPage: React.FC = () => {
  const resources = useResources();

  return isEmpty(resources) ? (
    <Loader />
  ) : (
    <>
      <PagePanel
        title="Джерела"
        description="Список джерел, які містяться в базі даних"
      />
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

export default ResourcesPage;
