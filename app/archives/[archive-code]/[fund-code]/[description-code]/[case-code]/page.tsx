"use client";

import { HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { GetCaseResponse } from "../../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";
import { Link } from "@chakra-ui/next-js";
import DuckTable from "../../../../../components/Table";
import { getSyncAtLabel } from "../../../../../utils/table";
import useIsMobile from "../../../../../hooks/useIsMobile";
import useCyrillicParams from "../../../../../hooks/useCyrillicParams";

type TableItem = GetCaseResponse["matches"][number];

const CasePage: NextPage = () => {
  const params = useCyrillicParams();
  const isMobile = useIsMobile();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const code = params["case-code"];

  const [caseItem, setCaseItem] = useState<GetCaseResponse>();

  useEffect(() => {
    const fetchCase = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`);
      const data = await response.json();
      setCaseItem(data);
    };
    fetchCase();
  }, [archiveCode, fundCode, descriptionCode, code]);

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
            {caseItem?.title}
          </Heading>
        </VStack>
      </HStack>
      <DuckTable<TableItem>
        columns={[
          {
            field: "resource.type",
            headerName: "Ресурс",
            maxWidth: 80,
            resizable: false,
            cellRenderer: (row: { value: number; data: TableItem }) => <Text color="green.500">{row.value}</Text>,
          },
          {
            field: "api_url",
            headerName: "Посилання",
            flex: 3,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value} isExternal color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            field: "last_count",
            headerName: "Файли",
            hide: isMobile,
            flex: 1,
            maxWidth: 80,
          },
          {
            field: "updated_at",
            type: "numericColumn",
            headerName: "Оновлено",
            hide: isMobile,
            flex: 1,
            maxWidth: 120,
            resizable: false,
            sortable: false,
            cellRenderer: (row: { value: string; data: TableItem }) => getSyncAtLabel(row.value, true),
          },
        ]}
        rows={caseItem?.matches || []}
      />
    </>
  );
};

export default CasePage;
