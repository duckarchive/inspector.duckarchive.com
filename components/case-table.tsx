"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/duck-table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { getSyncAtLabel } from "@/lib/table";
import useCase from "@/hooks/useCase";
import ResourceBadge from "./resource-badge";
import { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";

type TableItem = GetCaseResponse["matches"][number];

interface CaseTableProps {
  resources: Resources;
}

const CaseTable: React.FC<CaseTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const code = params["case-code"];
  const isMobile = useIsMobile();
  const { caseItem, isLoading } = useCase(archiveCode, fundCode, descriptionCode, code);

  // if (isLoading) return <Loader />;
  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} справа`}
        breadcrumbs={[archiveCode, fundCode, descriptionCode, code]}
        description={caseItem?.title || "Без назви"}
      />
      <InspectorDuckTable<TableItem>
        resources={resources}
        isLoading={isLoading}
        columns={[
          {
            field: "resource_id",
            headerName: "Ресурс",
            flex: 1.5,
            cellRenderer: (row: { value: TableItem["resource_id"] }) => (
              <ResourceBadge resources={resources} resourceId={row.value} />
            ),
          },
          {
            field: "url",
            headerName: "Посилання",
            flex: 8,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value} isExternal>
                {row.value || "Без назви"}
              </Link>
            ),
          },
          {
            field: "updated_at",
            headerName: "Перевірено",
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

export default CaseTable;
