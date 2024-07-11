"use client";

import { HStack, Input } from "@chakra-ui/react";
import { NextPage } from "next";
import WelcomeModal from "./components/WelcomeModal";
import SearchPanel from "./components/SearchPanel";
import { ChangeEvent, useState } from "react";
import { parseSearchQuery } from "./utils/parser";
import { Match } from "@prisma/client";
import { debounce } from "lodash";
import DuckTable from "./components/Table";
import { SearchResponse } from "../pages/api/search";
import { Link } from "@chakra-ui/next-js";

type TableItem = SearchResponse[number];

const SearchPage: NextPage = () => {
  const [searchResults, setSearchResults] = useState<SearchResponse>([]);
  const handleFormattedInputChange = debounce((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const parsed = parseSearchQuery(value);

    console.log(parsed);

    const fetchArchives = async () => {
      const response = await fetch("/api/search", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setSearchResults(data);
    };

    fetchArchives();
  }, 500);

  return (
    <>
      <WelcomeModal />
      <HStack justifyContent="center" alignItems="center" minH="32">
        <Input placeholder="ДАХмО Р6193-12-1" onChange={handleFormattedInputChange} size="lg" w="unset" />
      </HStack>
      <DuckTable<TableItem>
        columns={[
          {
            field: "archive.code",
            comparator: undefined,
            headerName: "Архів",
            flex: 1,
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
            type: "link",
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
