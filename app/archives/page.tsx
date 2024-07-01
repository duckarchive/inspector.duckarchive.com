"use client";

import { useEffect, useState } from "react";
import { HStack, Heading, Text, Tooltip } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import { intlFormatDistance } from "date-fns/intlFormatDistance";
import { ArchiumSyncArchiveResponse } from "../../pages/api/sync/archium/[archive_id]";
import DuckTable from "../components/Table";

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

  const handleSyncArchiveClick = (archiveId: string) => async () => {
    const response = await fetch(`/api/sync/archium/${archiveId}`);
    const data: ArchiumSyncArchiveResponse = await response.json();
    setArchives((prev) => prev.map((archive) => (archive.id === archiveId ? { ...archive, ...data } : archive)));
  };

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        Архіви
      </Heading>
      <DuckTable<TableItem>
        columns={[
          {
            field: "code",
            headerName: "Індекс",
            maxWidth: 100,
            resizable: false,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 3,
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
            flex: 1,
            maxWidth: 120,
            resizable: false,
            sortable: false,
            cellRenderer: (row: { data: TableItem }) => (
              <HStack>
                {row.data.matches.map(({ updated_at, children_count, resource: { type } }) => (
                  <Tooltip
                    key={`${row.data.id}_match_${type}`}
                    label={"Оновлено " + intlFormatDistance(new Date(updated_at || 0), new Date(), {
                      locale: "uk",
                    })}
                    hasArrow
                  >
                    <Text>
                      {children_count} {type}
                    </Text>
                  </Tooltip>
                ))}
              </HStack>
            ),
          },
        ]}
        rows={archives}
      />
    </>
  );
};

export default ArchivesPage;
