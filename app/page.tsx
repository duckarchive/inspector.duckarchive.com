"use client";

import { HStack } from "@chakra-ui/react";
import { NextPage } from "next";
import WelcomeModal from "./components/WelcomeModal";
import SearchPanel from "./components/SearchPanel";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash";
import DuckTable from "./components/Table";
import { SearchRequest, SearchResponse } from "../pages/api/search";
import { Link } from "@chakra-ui/next-js";

type TableItem = SearchResponse[number];

const SearchPage: NextPage = () => {
  const [searchValues, setSearchValues] = useState<SearchRequest>();
  const [searchResults, setSearchResults] = useState<SearchResponse>([]);

  const fetchSearch = useCallback(
    debounce(async (reqBody?: SearchRequest) => {
      if (!reqBody) {
        return;
      }
      const response = await fetch("/api/search", {
        method: "POST",
        body: JSON.stringify(reqBody),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setSearchResults(data);
    }, 500),
    []
  );

  useEffect(() => {
    fetchSearch(searchValues);
  }, [searchValues, fetchSearch]);

  const handleSearchChange = async (values: SearchRequest) => {
    setSearchValues((prev) => ({ ...prev, ...values }));
  };

  return (
    <>
      <WelcomeModal />
      <HStack justifyContent="center" alignItems="center" minH="32">
        <SearchPanel values={searchValues} onChange={handleSearchChange} />
      </HStack>
      <DuckTable<TableItem>
        columns={[
          {
            field: "archive.code",
            comparator: undefined,
            headerName: "Архів",
            flex: 1,
            resizable: true,
          },
          {
            field: "fund.code",
            comparator: undefined,
            headerName: "Фонд",
            flex: 1,
          },
          {
            field: "description.code",
            comparator: undefined,
            headerName: "Опис",
            flex: 1,
          },
          {
            field: "case.code",
            comparator: undefined,
            headerName: "Справа",
            flex: 1,
          },
          {
            field: "url",
            headerName: "Посилання",
            flex: 4,
            cellRenderer: (row: { value: string; data: TableItem }) => (
              <Link href={row.value || "#"} isExternal color="blue.600">
                {row.value || "Щось пішло не так"}
              </Link>
            ),
          },
        ]}
        rows={searchResults}
      />
    </>
  );
};

export default SearchPage;
