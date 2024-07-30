"use client";

import { useEffect, useState } from "react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import DuckTable from "../components/Table";
import PagePanel from "../components/PagePanel";
import Loader from "../components/Loader";

type TableItem = GetAllArchivesResponse[number];

const ArchivesPage: NextPage = () => {
  const [archives, setArchives] = useState<GetAllArchivesResponse>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchArchives = async () => {
      const response = await fetch("/api/archives");
      const data = await response.json();
      setArchives(data);
      setIsLoaded(true);
    };

    fetchArchives();
  }, []);

  return !isLoaded ? (
    <Loader />
  ) : (
    <>
      <PagePanel
        title="Архіви"
        description="Список архівів, які містяться в базі даних"
      />
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
                {row.value || `${row.data.code}`}
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
