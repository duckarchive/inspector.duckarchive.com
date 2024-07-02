"use client";

import { useEffect, useState } from "react";
import { Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import DuckTable from "../components/Table";
import { getSyncAtLabel } from "../utils/table";
import ResourceBadge from "../components/ResourceBadge";

type TableItem = GetAllArchivesResponse[number];

const ArchivesPage: NextPage = () => {
  const [archives, setArchives] = useState<GetAllArchivesResponse>([]);

  useEffect(() => {
    const fetchArchives = async () => {
      const response = await fetch("/api/archives");
      const data = await response.json();
      setArchives(data);
    };

    fetchArchives();
  }, []);

  return (
    <>
      <DuckTable<TableItem>
        columns={[
          {
            field: "code",
            headerName: "Індекс",
            flex: 1,
            resizable: false,
            filter: true,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`archives/${row.data.code}`} color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            colId: "sync",
            type: "numericColumn",
            headerName: "Фонди",
            flex: 2,
            resizable: false,
            sortable: false,
            cellRenderer: (row: { data: TableItem }) => (
              <VStack h="full" alignItems="flex-end" justifyContent="center">
                {row.data.matches?.map(({ updated_at, children_count, resource: { type } }) => (
                  <ResourceBadge resource={type} key={`${row.data.id}_match_${type}`}>
                    <Tooltip label={getSyncAtLabel(updated_at)} hasArrow>
                      <Text as="span">{children_count}</Text>
                    </Tooltip>
                  </ResourceBadge>
                ))}
              </VStack>
            ),
          },
        ]}
        rows={archives.filter((archive) => archive.matches.some((match) => match.children_count))}
      />
    </>
  );
};

export default ArchivesPage;
