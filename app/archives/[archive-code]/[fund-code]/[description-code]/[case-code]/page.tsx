"use client";

import { Heading, Text } from "@chakra-ui/react";
import { NextPage } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GetCaseResponse } from "../../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";
import { Link } from "@chakra-ui/next-js";
import DuckTable from "../../../../../components/Table";
import { getSyncAtLabel } from "../../../../../utils/table";
import useIsMobile from "../../../../../hooks/useIsMobile";

type TableItem = GetCaseResponse["matches"][number];

const CasePage: NextPage = () => {
  const params = useParams();
  const isMobile = useIsMobile();
  const archiveCode = decodeURIComponent(params?.["archive-code"].toString() || "");
  const fundCode = decodeURIComponent(params?.["fund-code"].toString() || "");
  const descriptionCode = decodeURIComponent(params?.["description-code"].toString() || "");
  const code = decodeURIComponent(params?.["case-code"].toString() || "");

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
      <Heading as="h1" size="lg" mb="4">
        {caseItem?.title}
      </Heading>
      <DuckTable<TableItem>
        columns={[
          {
            field: "resource.type",
            headerName: "Ресурс",
            maxWidth: 80,
            resizable: false,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Text color='green.500'>
                {row.value}
              </Text>
            ),
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
