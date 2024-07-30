"use client";

import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import { GetArchiveResponse } from "../../../pages/api/archives/[archive-code]";
import DuckTable from "../../components/Table";
import { sortByCode } from "../../utils/table";
import useIsMobile from "../../hooks/useIsMobile";
import useCyrillicParams from "../../hooks/useCyrillicParams";
import PagePanel from "../../components/PagePanel";
import Loader from "../../components/Loader";

type TableItem = GetArchiveResponse["funds"][number];

const ArchivePage: NextPage = () => {
  const params = useCyrillicParams();
  const isMobile = useIsMobile();
  const code = params["archive-code"];

  const [archive, setArchive] = useState<GetArchiveResponse>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchArchive = async () => {
      const response = await fetch(`/api/archives/${code}`);
      const data = await response.json();
      setArchive(data);
      setIsLoaded(true);
    };
    fetchArchive();
  }, [code]);

  return !isLoaded ? (
    <Loader />
  ) : (
    <>
      <PagePanel
        titleLabel="Архів"
        title={archive?.title || "Архів"}
        image={`/${archive?.logo_url}`}
      />
      <DuckTable<TableItem>
        enabledFilters={{
          partFunds: true,
          preUssrFunds: true,
          ussrFunds: true,
        }}
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
              <Link href={`/archives/${code}/${row.data.code}`} color="blue.600">
                {row.value || "Без назви"}
              </Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Описи",
            hide: isMobile,
          },
        ]}
        rows={archive?.funds.sort(sortByCode) || []}
      />
    </>
  );
};

export default ArchivePage;
