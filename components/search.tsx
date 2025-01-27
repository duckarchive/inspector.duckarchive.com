"use client";

import { Archives } from "@/data/archives";
import PagePanel from "./page-panel";
import { useEffect, useState } from "react";
import { SearchRequest, SearchResponse } from "@/pages/api/search";
import useSearch from "@/hooks/useSearch";
import { Button, Checkbox, Input, Link } from "@heroui/react";
import { FaFeather } from "react-icons/fa";
import useSearchRequest from "@/hooks/useSearchRequest";
import DuckTable from "./duck-table";
import Loader from "./loader";
import useIsMobile from "@/hooks/useIsMobile";
import { sortCode } from "@/lib/table";
import { sendGTMEvent } from "@next/third-parties/google";
import useNoRussians from "../hooks/useNoRussians";
import SelectArchive from "./select-archive";

type TableItem = SearchResponse[number];

interface SearchProps {
  archives: Archives;
}

const Search: React.FC<SearchProps> = ({ archives }) => {
  useNoRussians();
  const isMobile = useIsMobile();
  const [defaultValues, setQueryParams] = useSearch(archives);
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);
  const { searchResults, isLoading, isError, trigger } = useSearchRequest();

  useEffect(() => {
    trigger(searchValues);
  }, []);

  const handleInputChange = (key: keyof SearchRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^А-ЯҐЄІЇ0-9]/gi, "").toUpperCase();
    setSearchValues({ ...searchValues, [key]: value });
  };

  const handleStrictChange = (value: boolean) => {
    setSearchValues({ ...searchValues, isStrict: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fullCode = `${searchValues.a}-${searchValues.f}-${searchValues.d}-${searchValues.c}`;
    sendGTMEvent({ category: "search", action: "submit", label: "search", value: fullCode });
    setQueryParams(searchValues);
    trigger(searchValues);
  };

  return (
    <>
      <PagePanel
        title="Пошук"
        description="Оберіть архів, фонд, опис та справу і натисніть Enter. Якщо вам пощастить, то за декілька секунд ви отримаєте посилання на запитувану справу на одному з онлайн джерел."
        message={
          <p className="text-gray-600 text-xs my-2 bg-amber-100 p-2 rounded-md">
            Кількість результатів пошуку обмежена 20 справами, тому намагайтесь конкретизувати свій запит, або
            використовуйте&nbsp;
            <Link href="/archives" className="text-xs">
              навігацію по архівам
            </Link>
            , для перегляду всіх справ.
          </p>
        }
      >
        <form className="flex flex-col grow shrink-0 basis-6/12 gap-2 items-center" onSubmit={handleSubmit}>
          <SelectArchive
            archives={archives}
            value={searchValues.a}
            onChange={(v) => setSearchValues({ ...searchValues, a: v?.toString() || undefined })}
          />
          <div className="flex gap-2 w-full">
            <Input label="Фонд" value={searchValues.f} onChange={handleInputChange("f")} />
            <Input label="Опис" value={searchValues.d} onChange={handleInputChange("d")} />
            <Input label="Справа" value={searchValues.c} onChange={handleInputChange("c")} />
          </div>
          <Button
            type="submit"
            color="primary"
            variant="light"
            endContent={<FaFeather />}
            className="w-full border-blue-200 border"
          >
            Полетіли
          </Button>
          <Checkbox
            isSelected={searchValues.isStrict}
            size="sm"
            className="self-start"
            onValueChange={handleStrictChange}
          >
            Суворий пошук
          </Checkbox>
        </form>
      </PagePanel>
      {isError && <p className="text-danger">Щось пішло не так</p>}
      {isLoading ? (
        <Loader />
      ) : (
        <DuckTable<TableItem>
          columns={[
            {
              field: "archive_code",
              comparator: undefined,
              filter: false,
              headerName: "Архів",
              flex: 1,
              resizable: true,
              hide: isMobile,
              cellRenderer: (row: { value: TableItem["archive_code"]; data: TableItem }) => (
                <Link href={`/archives/${row.data.archive_code}`} className="text-inherit text-sm">
                  {row.value}
                </Link>
              ),
            },
            {
              field: "fund_code",
              comparator: sortCode,
              headerName: "Фонд",
              flex: 1,
              hide: isMobile,
              cellRenderer: (row: { value: TableItem["fund_code"]; data: TableItem }) => (
                <Link
                  href={`/archives/${row.data.archive_code}/${row.data.fund_code}`}
                  className="text-inherit text-sm"
                >
                  {row.value}
                </Link>
              ),
            },
            {
              field: "description_code",
              comparator: sortCode,
              headerName: "Опис",
              flex: 1,
              hide: isMobile,
              cellRenderer: (row: { value: TableItem["description_code"]; data: TableItem }) => (
                <Link
                  href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}`}
                  className="text-inherit text-sm"
                >
                  {row.value}
                </Link>
              ),
            },
            {
              field: "case_code",
              comparator: sortCode,
              headerName: "Справа",
              flex: 1,
              hide: isMobile,
              cellRenderer: (row: { value: TableItem["case_code"]; data: TableItem }) => (
                <Link
                  href={`/archives/${row.data.archive_code}/${row.data.fund_code}/${row.data.description_code}/${row.data.case_code}`}
                  className="text-inherit text-sm"
                >
                  {row.value}
                </Link>
              ),
            },
            {
              field: "url",
              type: undefined,
              headerName: "Посилання",
              resizable: isMobile,
              minWidth: 400,
              flex: 4,
              comparator: undefined,
              cellRenderer: (row: { value: string; data: TableItem }) => (
                <Link href={row.value || "#"} isExternal>
                  {row.value || "Щось пішло не так"}
                </Link>
              ),
            },
          ]}
          rows={searchResults || []}
        />
      )}
    </>
  );
};

export default Search;
