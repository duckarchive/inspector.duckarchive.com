"use client";

import { Avatar, HStack, Heading, Image, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import { GetArchiveResponse } from "../../../pages/api/archives/[archive-code]";
import DuckTable from "../../components/Table";
import { sortByCode } from "../../utils/table";
import useIsMobile from "../../hooks/useIsMobile";
import useCyrillicParams from "../../hooks/useCyrillicParams";

type TableItem = GetArchiveResponse["funds"][number];

const ArchivePage: NextPage = () => {
  const params = useCyrillicParams();
  const isMobile = useIsMobile();
  const code = params["archive-code"];

  const [archive, setArchive] = useState<GetArchiveResponse>();

  useEffect(() => {
    const fetchArchive = async () => {
      const response = await fetch(`/api/archives/${code}`);
      const data = await response.json();
      setArchive(data);
    };
    fetchArchive();
  }, [code]);

  return (
    <>
      <HStack justifyContent="space-between" alignItems="flex-start" minH="32">
        <HStack alignItems="center">
          <Avatar
            rounded="full"
            src={`/${archive?.logo_url}`}
            name={archive?.title || "Архів"}
            size="xl"
          />
          <Heading as="h1" size="lg" lineHeight={1}>
            {archive?.title}
          </Heading>
        </HStack>
      </HStack>
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
