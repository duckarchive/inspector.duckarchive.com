"use client";

import {
  Heading,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSyncAtLabel } from "../../../../utils/table";
import DuckTable from "../../../../components/Table";
import { GetDescriptionResponse } from "../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]";
import useIsMobile from "../../../../hooks/useIsMobile";

type TableItem = GetDescriptionResponse["cases"][number];

const DescriptionPage: NextPage = () => {
  const params = useParams();
  const isMobile = useIsMobile();
  const archiveCode = decodeURIComponent(
    params?.["archive-code"].toString() || ""
  );
  const fundCode = decodeURIComponent(params?.["fund-code"].toString() || "");
  const code = decodeURIComponent(
    params?.["description-code"].toString() || ""
  );

  const [description, setDescription] = useState<GetDescriptionResponse>();

  useEffect(() => {
    const fetchDescription = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${fundCode}/${code}`);
      const data = await response.json();
      setDescription(data);
    };
    fetchDescription();
  }, [archiveCode, fundCode, code]);

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        {description?.title}
      </Heading>
      <DuckTable<TableItem>
        columns={[
          {
            field: "code",
            headerName: "Індекс",
            maxWidth: 80,
            resizable: false,
          },
          {
            field: "title",
            headerName: "Назва",
            flex: 3,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/archives/${archiveCode}/${fundCode}/${code}/${row.data.code}`} color="blue.600">
                {row.value}
              </Link>
            ),
          },
          {
            colId: "sync",
            type: "numericColumn",
            headerName: "Файли",
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
        rows={description?.cases || []}
      />
    </>
  );
};

export default DescriptionPage;
