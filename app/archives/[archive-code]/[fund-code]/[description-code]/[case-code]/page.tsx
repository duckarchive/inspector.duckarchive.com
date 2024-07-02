"use client";

import { HStack, Heading, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { GetCaseResponse } from "../../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";
import { Link } from "@chakra-ui/next-js";
import DuckTable from "../../../../../components/Table";
import { getSyncAtLabel } from "../../../../../utils/table";
import useIsMobile from "../../../../../hooks/useIsMobile";
import useCyrillicParams from "../../../../../hooks/useCyrillicParams";
import ResourceBadge from "../../../../../components/ResourceBadge";

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
            flex: 1,
            cellRenderer: (row: { value: TableItem["resource"]["type"]; data: TableItem }) => (
              <ResourceBadge resource={row.value} />
            ),
          },
          {
            field: "api_url",
            headerName: "Посилання",
            flex: 8,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value} isExternal color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            field: "updated_at",
            headerName: "Оновлено",
            flex: 2,
            hide: isMobile,
            cellRenderer: (row: { value: string; data: TableItem }) => getSyncAtLabel(row.value, true),
          },
          {
            field: "last_count",
            headerName: "Файли",
            type: "numericColumn",
            flex: 1,
            hide: isMobile,
            resizable: false,
          },
        ]}
        rows={caseItem?.matches || []}
      />
    </>
  );
};

export default CasePage;
