"use client";

import { NextPage } from "next";
import { useEffect, useState } from "react";
import { GetCaseResponse } from "../../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";
import { Link } from "@chakra-ui/next-js";
import DuckTable from "../../../../../components/Table";
import { getSyncAtLabel } from "../../../../../utils/table";
import useIsMobile from "../../../../../hooks/useIsMobile";
import useCyrillicParams from "../../../../../hooks/useCyrillicParams";
import ResourceBadge from "../../../../../components/ResourceBadge";
import PagePanel from "../../../../../components/PagePanel";
import Loader from "../../../../../components/Loader";

type TableItem = GetCaseResponse["matches"][number];

const CasePage: NextPage = () => {
  const params = useCyrillicParams();
  const isMobile = useIsMobile();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const code = params["case-code"];

  const [caseItem, setCaseItem] = useState<GetCaseResponse>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`);
      const data = await response.json();
      setCaseItem(data);
      setIsLoaded(true);
    };
    fetchCase();
  }, [archiveCode, fundCode, descriptionCode, code]);

  return !isLoaded ? (
    <Loader />
  ) : (
    <>
      <PagePanel titleLabel={`Справа ${code}`} title={caseItem?.title || ""} />
      <DuckTable<TableItem>
        columns={[
          {
            field: "resource_id",
            headerName: "Ресурс",
            flex: 1.5,
            cellRenderer: (row: { value: TableItem["resource_id"] }) => <ResourceBadge resourceId={row.value} />,
          },
          {
            field: "url",
            headerName: "Посилання",
            flex: 8,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value} isExternal color="blue.600">
                {row.value || "Без назви"}
              </Link>
            ),
          },
          {
            field: "updated_at",
            headerName: "Оновлено",
            flex: 2,
            hide: isMobile,
            cellRenderer: (row: { value: string; data: TableItem }) => getSyncAtLabel(row.value, true),
            comparator: undefined,
          },
        ]}
        rows={caseItem?.matches || []}
      />
    </>
  );
};

export default CasePage;
