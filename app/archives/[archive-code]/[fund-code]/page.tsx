"use client";

import { HStack, Heading, Text, Tooltip, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import DuckTable from "../../../components/Table";
import { GetFundResponse } from "../../../../pages/api/archives/[archive-code]/[fund-code]";
import { getSyncAtLabel, sortByCode, sortByMatches, sortNumeric } from "../../../utils/table";
import useIsMobile from "../../../hooks/useIsMobile";
import useCyrillicParams from "../../../hooks/useCyrillicParams";
import ResourceBadge from "../../../components/ResourceBadge";

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
            flex: 1,
            comparator: sortNumeric,
            filter: true,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 9,
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
            flex: 2,
            hide: isMobile,
            resizable: false,
            comparator: (_, __, { data: a }, { data: b }) => sortByMatches(a, b),
            cellRenderer: (row: { data: TableItem }) => (
              <VStack h="full" alignItems="flex-end" justifyContent="center">
                {row.data.matches?.map(({ updated_at, children_count, resource: { type } }) => children_count && (
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
        rows={fund?.descriptions.sort(sortByCode) || []}
      />
    </>
  );
};

export default FundPage;
