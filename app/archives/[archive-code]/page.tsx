"use client";

import { HStack, Heading, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import { GetArchiveResponse } from "../../../pages/api/archives/[archive-code]";
import DuckTable from "../../components/Table";
import { getSyncAtLabel, sortByCode, sortByMatches, sortNumeric } from "../../utils/table";
import useIsMobile from "../../hooks/useIsMobile";
import useCyrillicParams from "../../hooks/useCyrillicParams";
import ResourceBadge from "../../components/ResourceBadge";

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
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        bg="white"
        mb={2}
        p={2}
        borderRadius="lg"
        minH="32"
      >
        <VStack alignItems="flex-start">
          <Heading as="h1" size="lg" mb="4">
            {archive?.title}
          </Heading>
        </VStack>
        {archive?.logo_url && <Image src={`/${archive.logo_url}`} alt={`Прапор ${archive?.title}`} maxH="32" />}
      </HStack>
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
              <Link href={`/archives/${code}/${row.data.code}`} color="blue.600">
                {row.value}
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
