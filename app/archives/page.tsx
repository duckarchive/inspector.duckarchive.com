"use client";

import { useEffect, useState } from "react";
import { Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import DuckTable from "../components/Table";
import { getSyncAtLabel, sortByMatches } from "../utils/table";
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
            headerName: "Фонди",
          },
        ]}
        rows={archives}
      />
    </>
  );
};

export default ArchivesPage;
