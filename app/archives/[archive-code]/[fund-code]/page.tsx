"use client";

import { HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useEffect, useState } from "react";
import DuckTable from "../../../components/Table";
import { GetFundResponse } from "../../../../pages/api/archives/[archive-code]/[fund-code]";
import { sortByCode } from "../../../utils/table";
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
      <HStack justifyContent="space-between" alignItems="flex-start" minH="32">
        <HStack alignItems="center">
          <Text fontSize="xl" color="gray.500">
            Фонд:
          </Text>
          <Heading as="h1" size="lg" lineHeight={1}>
            {fund?.title}
          </Heading>
        </HStack>
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
              <Link href={`/archives/${archiveCode}/${code}/${row.data.code}`} color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Справи",
            hide: isMobile,
          },
        ]}
        rows={fund?.descriptions.sort(sortByCode) || []}
      />
    </>
  );
};

export default FundPage;
