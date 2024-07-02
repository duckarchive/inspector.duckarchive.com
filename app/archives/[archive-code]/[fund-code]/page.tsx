"use client";

import { HStack, Heading, Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import DuckTable from "../../../components/Table";
import { GetFundResponse } from "../../../../pages/api/archives/[archive-code]/[fund-code]";
import { getSyncAtLabel } from "../../../utils/table";
import useIsMobile from "../../../hooks/useIsMobile";
import useCyrillicParams from "../../../hooks/useCyrillicParams";

type TableItem = GetFundResponse["descriptions"][number];

const FundPage: NextPage = () => {
  const isMobile = useIsMobile();
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const code = params["fund-code"];

  const [fund, setFund] = useState<GetFundResponse>();

  useEffect(() => {
    const fetchFund = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${code}`);
      const data = await response.json();
      setFund(data);
    };
    fetchFund();
  }, [code, archiveCode]);

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
        <VStack>
          <Heading as="h1" size="lg" mb="4">
            {fund?.title}
          </Heading>
        </VStack>
      </HStack>
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
              <Link href={`/archives/${archiveCode}/${code}/${row.data.code}`} color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            colId: "sync",
            type: "numericColumn",
            headerName: "Справи",
            hide: isMobile,
            flex: 1,
            maxWidth: 120,
            resizable: false,
            sortable: false,
            cellRenderer: (row: { data: TableItem }) =>
              row.data.matches?.map(({ updated_at, children_count, resource: { type } }) => (
                <Tooltip key={`${row.data.id}_match_${type}`} label={getSyncAtLabel(updated_at)} hasArrow>
                  <Text>{children_count}</Text>
                </Tooltip>
              )),
          },
        ]}
        rows={fund?.descriptions || []}
      />
    </>
  );
};

export default FundPage;
