"use client";

import { Archives } from "@/data/archives";
import PagePanel from "./page-panel";
import { useEffect, useState } from "react";
import { SearchRequest, SearchResponse } from "@/pages/api/search";
import useSearch from "@/hooks/useSearch";
import { Autocomplete, AutocompleteItem, Button, Input, Link } from "@nextui-org/react";
import { FaFeather } from "react-icons/fa";
import useSearchRequest from "../hooks/useSearchRequest";
import DuckTable from "./duck-table";
import Loader from "./loader";

type TableItem = SearchResponse[number];

interface SearchProps {
  archives: Archives;
}

const Search: React.FC<SearchProps> = ({ archives }) => {
  const [defaultValues, setQueryParams] = useSearch(archives);
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);
  const { searchResults, isLoading, isError, trigger } = useSearchRequest();

  useEffect(() => {
    trigger(searchValues);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQueryParams(searchValues);
    trigger(searchValues);
  };

  return (
    <>
      <PagePanel
        title="Пошук"
        description="Оберіть архів, фонд, опис та справу та натисніть Enter. Якщо вам пощастить, то за декілька секунд ви отримаєте посилання на запитувану справу на одному з онлайн джерел."
      >
        <form className="flex flex-col grow shrink-0 basis-6/12 gap-2 items-center" onSubmit={handleSubmit}>
          <Autocomplete
            label="Архів"
            isClearable={false}
            selectedKey={searchValues.a}
            onSelectionChange={(value) => setSearchValues({ ...searchValues, a: value?.toString() || undefined })}
          >
            {archives.map((archive) => (
              <AutocompleteItem key={archive.code} value={archive.code} textValue={archive.code}>
                <div>
                  <p>{archive.code}</p>
                  <p className="opacity-70 text-sm text-wrap">{archive.title}</p>
                </div>
              </AutocompleteItem>
            ))}
          </Autocomplete>
          <div className="flex gap-2">
            <Input
              label="Фонд"
              value={searchValues.f}
              onChange={(e) => setSearchValues({ ...searchValues, f: e.target.value })}
            />
            <Input
              label="Опис"
              value={searchValues.d}
              onChange={(e) => setSearchValues({ ...searchValues, d: e.target.value })}
            />
            <Input
              label="Справа"
              value={searchValues.c}
              onChange={(e) => setSearchValues({ ...searchValues, c: e.target.value })}
            />
          </div>
          <Button type="submit" color="primary" variant="light" className="w-full" endContent={<FaFeather />}>
            Полетіли
          </Button>
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
            },
            {
              field: "fund_code",
              headerName: "Фонд",
              flex: 1,
            },
            {
              field: "description_code",
              comparator: undefined,
              headerName: "Опис",
              flex: 1,
            },
            {
              field: "case_code",
              comparator: undefined,
              headerName: "Справа",
              flex: 1,
            },
            {
              field: "url",
              headerName: "Посилання",
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
