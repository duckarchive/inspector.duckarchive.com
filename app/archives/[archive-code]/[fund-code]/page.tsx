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
import PagePanel from "../../../components/PagePanel";

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
      <PagePanel
        titleLabel={`Фонд ${code}`}
        title={fund?.title || ""}
      />
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
                {row.value || "Без назви"}
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
