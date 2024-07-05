"use client";

import { useEffect, useState } from "react";
import { HStack, Heading, Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
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

  return (
    <>
      <HStack justifyContent="space-between" alignItems="flex-start" minH="32">
        <Heading as="h1" size="lg" lineHeight={1}>
          Оберіть архів
        </Heading>
      </HStack>
      <DuckTable<TableItem>
        columns={[
          {
            field: "code",
            comparator: undefined,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`archives/${row.data.code}`} color="blue.600">
                {row.value || "Без назви"}
              </Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Фонди",
          },
        ]}
        rows={archives}
      />
    </>
  );
};

export default ArchivesPage;
