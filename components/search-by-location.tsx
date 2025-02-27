"use client";

import { Archives } from "@/data/archives";
import { useEffect, useState } from "react";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import useSearch from "@/hooks/useSearch";
import { Avatar, Button, Checkbox, Input, Link } from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import useSearchRequest from "@/hooks/useSearchRequest";
import DuckTable from "./duck-table";
import useIsMobile from "@/hooks/useIsMobile";
import { sortCode } from "@/lib/table";
import { sendGAEvent } from "@next/third-parties/google";
import SelectArchive from "./select-archive";
import SearchInputGuideModal from "./search-input-guide-modal";
import Image from "next/image";
import RidniLogoSrc from "@/public/images/ridni-logo-horizontal.svg";
import useSearchByLocationRequest from "@/hooks/useSearchByLocationRequest";

type TableItem = SearchResponse["items"][number];

interface SearchByLocationProps {
  archives: Archives;
}

const SearchByLocation: React.FC<SearchByLocationProps> = ({ archives }) => {
  const isMobile = useIsMobile();
  const [place, setPlace] = useState<string>("");
  const { data, update } = useSearchByLocationRequest(archives);

  const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^А-ЯҐЄІЇ0-9]/gi, "");
    setPlace(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // const fullCode = `${searchValues.a}-${searchValues.f}-${searchValues.d}-${searchValues.c}`;
    // sendGAEvent("event", "search-form", { value: fullCode });
    // setQueryParams(searchValues);
    // trigger(searchValues);
    await update({ settlement: place, searchType: 'places' });
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="basis-2/3">
          <div className="flex justify-between w-full">
            <h1 className="text-lg font-bold">Пошук за назвою населеного пункту:</h1>
            <SearchInputGuideModal />
          </div>
          <form className="flex flex-col gap-2 items-center" onSubmit={handleSubmit}>
            <Input label="Саксагань" value={place} onChange={handlePlaceChange} />
            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full font-bold text-lg"
              startContent={<FaSearch />}
            >
              Пошук
            </Button>
            {/* <div className="flex flex-col-reverse md:flex-row justify-between items-start w-full">
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
            </div> */}
          </form>
        </div>
        <div className="flex items-center gap-2 basis-1/3 shrink">
          <h2 className="text-lg font-thin shrink-0">у співпраці з</h2>
          <Image src={RidniLogoSrc} alt="Рідні" className="h-24" />
        </div>
      </div>
      {/* {isError && <p className="text-danger">Щось пішло не так</p>}
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
      /> */}
    </>
  );
};

export default SearchByLocation;
