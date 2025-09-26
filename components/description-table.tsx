"use client";

import { Link } from "@heroui/link";
import { Resources } from "@/data/resources";
import InspectorDuckTable from "@/components/table";
import useIsMobile from "@/hooks/useIsMobile";
import useCyrillicParams from "@/hooks/useCyrillicParams";
import PagePanel from "./page-panel";
import { sortByCode } from "@/lib/table";
import useDescription from "@/hooks/useDescription";
import { GetDescriptionResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import { getYearsString } from "@/lib/text";

type TableItem = GetDescriptionResponse["cases"][number];

const Details: React.FC<{
  description?: GetDescriptionResponse;
}> = ({ description }) => (
  <div className="text-sm text-gray-500">
    {description?.info && <p>{description.info}</p>}
    {description?.years.length || description?.matches?.length ? (
      <ul className="list-disc list-inside py-2">
        {Boolean(description.years.length) && <li>Роки: {getYearsString(description.years)}</li>}
        {(description.matches.filter(match => match.url) as { url: string }[]).map((match) => (
          <li key={match.url}>
            <Link href={match.url} target="_blank" className="text-inherit text-sm underline">
              {match.url}
            </Link>
          </li>
        ))}
      </ul>
    ) : null}
  </div>
);

interface DescriptionTableProps {
  resources: Resources;
}

const DescriptionTable: React.FC<DescriptionTableProps> = ({ resources }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const code = params["description-code"];
  const isMobile = useIsMobile();
  const { description, isLoading, page } = useDescription(archiveCode, fundCode, code);

  // if (isError) return <Error error={} />
  return (
    <>
      <PagePanel
        title={`${code} опис`}
        breadcrumbs={[archiveCode, fundCode, code]}
        description={description?.title || "Без назви"}
        message={<Details description={description} />}
      />
      <InspectorDuckTable<TableItem>
        resources={resources}
        isLoading={isLoading}
        loadingPage={page}
        columns={[
          {
            field: "code",
          },
          {
            field: "title",
            headerName: "Назва справи",
            flex: 9,
            filter: true,
            cellRenderer: (row: { value: number; data: TableItem }) => (
              <Link href={`/archives/${archiveCode}/${fundCode}/${code}/${row.data.code}`}>
                {row.value || `Справа ${row.data.code}`}
              </Link>
            ),
          },
          {
            colId: "sync",
            headerName: "Файли",
            hide: isMobile,
          },
        ]}
        rows={description?.cases?.sort(sortByCode) || []}
      />
    </>
  );
};

export default DescriptionTable;
