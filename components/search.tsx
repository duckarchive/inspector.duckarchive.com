"use client";

import { Archives } from "@/data/archives";
import { useEffect, useState } from "react";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import useSearch from "@/hooks/useSearch";
import { Button, Checkbox, Input, Link } from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import useSearchRequest from "@/hooks/useSearchRequest";
import DuckTable from "./duck-table";
import useIsMobile from "@/hooks/useIsMobile";
import { sortCode } from "@/lib/table";
import { sendGAEvent } from "@next/third-parties/google";
import SelectArchive from "./select-archive";
import SearchInputGuideModal from "./search-input-guide-modal";

type TableItem = SearchResponse["items"][number];

interface SearchProps {
  archives: Archives;
}

const Search: React.FC<SearchProps> = ({ archives }) => {
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
    sendGAEvent('event', 'search-form', { value: fullCode });
    setQueryParams(searchValues);
    trigger(searchValues);
  };

  const count = searchResults?.items.length || 0;
  const totalCount = searchResults?.total_count || 0;

  return (
    <>
      <div className="flex justify-between w-full">
        <h1 className="text-lg font-bold">Пошук справ:</h1>
        <SearchInputGuideModal />
      </div>
      <form className="flex flex-col gap-2 items-center" onSubmit={handleSubmit}>
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
          size="lg"
          className="w-full font-bold text-lg"
          startContent={<FaSearch />}
        >
          Пошук
        </Button>
        <div className="flex flex-col-reverse md:flex-row justify-between items-start w-full">
          {totalCount > 20 ? (
            <div className="text-warning text-sm basis-1/2">
              <p>
                Кількість результатів:&nbsp;
                <span className="font-bold">
                  {count}/{totalCount}
                </span>
              </p>
              <p>
                Зверніть увагу! Нижче показано лише 20 знайдених справ, через обмеження пошуку. Щоб побачити всі
                результати,&nbsp;
                <Link href="/archives" className="text-sm" target="_blank">
                  використовуйте навігацію по архівах
                </Link>
                .
              </p>
            </div>
          ) : (
            <p className="text-sm">
              Кількість результатів:&nbsp;
              <span className="font-bold">
                {count}/{totalCount}
              </span>
            </p>
          )}
          <Checkbox
            isSelected={searchValues.isStrict}
            size="sm"
            className="flex-row-reverse gap-1 p-0 m-0"
            onValueChange={handleStrictChange}
          >
            Суворий пошук
          </Checkbox>
        </div>
      </form>
      {isError && <p className="text-danger">Щось пішло не так</p>}
      <DuckTable<TableItem>
        isLoading={isLoading}
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
              <Link href={`/archives/${row.data.archive_code}`} className="text-inherit text-sm" target="_blank">
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
                target="_blank"
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
                target="_blank"
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
                target="_blank"
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
        rows={searchResults?.items || []}
      />
    </>
  );
};

export default Search;
