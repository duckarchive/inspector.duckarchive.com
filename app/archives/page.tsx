"use client";

import { useEffect, useState } from "react";
import { Button, Heading } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import { sortByTextCode } from "../utils/table";
import { IoRefresh } from "react-icons/io5";
import { intlFormatDistance } from "date-fns/intlFormatDistance";
import { ArchiumArchiveSyncResponse } from "../../pages/api/sync/archium/[archive_id]";
import DuckTable from "../components/Table";
import { Archive } from "@prisma/client";

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
    const data: ArchiumArchiveSyncResponse = await response.json();
    setArchives((prev) =>
      prev.map((archive) =>
        archive.id === archiveId ? { ...archive, ...data } : archive
      )
    );
  };

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        Архіви
      </Heading>
      <DuckTable<GetAllArchivesResponse[0]>
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
            cellRenderer: (row: { value: number; data: Archive }) => (
              <Link href={`archives/${row.data.code}`} color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            field: "count",
            headerName: "Справ онлайн",
            flex: 1,
            cellRenderer: (row: { value: number; data: Archive }) => (
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<IoRefresh />}
                fontSize="sm"
                onClick={handleSyncArchiveClick(row.data.id)}
              >
                {row.value}
              </Button>
            ),
          },
          {
            field: "updated_at",
            headerName: "Оновлено",
            maxWidth: 120,
            resizable: false,
            cellRenderer: (row: { value: number; data: Archive }) =>
              intlFormatDistance(
                new Date(row.data.updated_at || row.data.created_at),
                new Date(),
                {
                  locale: "uk",
                }
              ),
          },
        ]}
        rows={archives}
      />
    </>
  );
};

export default ArchivesPage;
