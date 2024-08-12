"use client";

import { Archives } from "@/data/archives";
import PagePanel from "./page-panel";
import { useState } from "react";
import { SearchRequest } from "@/pages/api/search";
import useSearch from "@/hooks/useSearch";
import { Autocomplete, AutocompleteItem, Button, Input } from "@nextui-org/react";
import { FaFeather } from "react-icons/fa";

interface SearchProps {
  archives: Archives;
}

const Search: React.FC<SearchProps> = ({ archives }) => {
  const [defaultValues, setQueryParams] = useSearch(archives);
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQueryParams(searchValues);
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
          <Button type="submit" color="primary" variant="light" className="w-full" endContent={<FaFeather />}>
            Полетіли
          </Button>
        </form>
      </PagePanel>
      {/* <DuckTable<TableItem> */}
    </>
  );
};

export default Search;
