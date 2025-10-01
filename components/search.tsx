"use client";
import { useState, useEffect } from "react";

import { usePost } from "@/hooks/useApi";
import useSearch from "@/hooks/useSearch";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import CatalogDuckTable from "@/components/table";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Select, SelectItem } from "@heroui/select";
import { FaSearch } from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import { Archives } from "@/data/archives";
import SelectArchive from "@/components/select-archive";
import TagChip from "@/components/tag-chip";
import CoordinatesInput from "@/components/coordinates-input";

type TableItem = SearchResponse[number];

interface SearchProps {
  archives: Archives;
  tags: string[];
}

const Search: React.FC<SearchProps> = ({ archives, tags }) => {
  const [defaultValues, setQueryParams] = useSearch();
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);
  const { trigger, isMutating, data: searchResults } = usePost<SearchResponse, SearchRequest>(`/api/search`);

  useEffect(() => {
    trigger(searchValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQueryParams(searchValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValues]);

  const handleInputChange = (key: keyof SearchRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValues({ ...searchValues, [key]: value });
  };

  const handleYearChange = (value: string) => {
    setSearchValues({ ...searchValues, year: value || undefined });
  };

  // const handleGeoChange = (position: [number, number]) => {
  //   setSearchValues({ ...searchValues, lat: position[0], lng: position[1] });
  // };

  // const handleLatInputChange = (value: number) => {
  //   setSearchValues({ ...searchValues, lat: value });
  // };

  // const handleLngInputChange = (value: number) => {
  //   setSearchValues({ ...searchValues, lng: value });
  // };

  // const handleRadiusInputChange = (value: number) => {
  //   setSearchValues({ ...searchValues, radius_m: value });
  // };

  const handlePlaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (searchValues.lat || searchValues.lng) {
      const isConfirmed = window.confirm("Поля 'Широта' та 'Довгота' будуть очищені. Продовжити?");
      if (!isConfirmed) {
        return;
      }
    }
    const value = e.target.value;
    setSearchValues({ ...searchValues, lat: undefined, lng: undefined, place: value });
  };

  const handleOpenMap = () => {
    if (searchValues.place) {
      const isConfirmed = window.confirm("Поле 'Населений пункт' буде очищено. Продовжити?");
      if (!isConfirmed) {
        return;
      }
    }
    setSearchValues({ ...searchValues, place: undefined });
    // onOpen();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trigger(searchValues);
  };

  return (
    <>
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex flex-col gap-2 basis-1/2 shrink-0" onClick={handleOpenMap}>
            <CoordinatesInput
              isLoading={isMutating}
              year={searchValues.year || undefined}
              value={{
                lat: searchValues.lat || undefined,
                lng: searchValues.lng || undefined,
                radius_m: searchValues.radius_m || undefined,
              }}
              onChange={(value) => setSearchValues({ ...searchValues, ...value })}
            />
            <Input
              isClearable
              value={searchValues.place || ""}
              onChange={handlePlaceInputChange}
              onClear={() => setSearchValues({ ...searchValues, place: undefined })}
              pattern="[\u0400-\u04FF\u0500-\u052F]+"
              label="Назва населеного пункту"
              labelPlacement="inside"
            />
          </div>
          <div className="flex flex-col gap-2 basis-1/2">
            <div className="flex flex-col">
              <div className="flex gap-2">
                <Input
                  label="Заголовок справи"
                  value={searchValues.title || ""}
                  onChange={handleInputChange("title")}
                />
                <Input
                  type="number"
                  className="basis-32 shrink-0"
                  value={searchValues.year}
                  onValueChange={handleYearChange}
                  label="Рік"
                  labelPlacement="inside"
                />
              </div>
              <Accordion isCompact defaultSelectedKeys={["map-help"]} className="p-0" variant="light">
                <AccordionItem
                  key="map-help"
                  aria-label="Open map to select location"
                  className="flex flex-col"
                  classNames={{
                    trigger: `p-0 gap-1 w-auto`,
                    content: "p-0 flex flex-col gap-2",
                    title: "text-xs opacity-50",
                    indicator: "inline-flex leading-none",
                  }}
                  disableIndicatorAnimation
                  indicator={({ isOpen }) => (
                    <IoChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
                  )}
                  title="Розгорніть для вводу архівних реквізитів"
                >
                  <SelectArchive
                    archives={archives}
                    value={searchValues.archive}
                    onChange={(v) => setSearchValues({ ...searchValues, archive: v?.toString() || undefined })}
                  />
                  <div className="flex gap-2">
                    <Input label="Фонд" value={searchValues.fund || ""} onChange={handleInputChange("fund")} />
                    <Input
                      label="Опис"
                      value={searchValues.description || ""}
                      onChange={handleInputChange("description")}
                    />
                    <Input label="Справа" value={searchValues.case || ""} onChange={handleInputChange("case")} />
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
            <Select
              className="grow-1"
              label="Теги"
              selectionMode="multiple"
              value={searchValues.tags || []}
              onSelectionChange={(v) =>
                setSearchValues({
                  ...searchValues,
                  tags: Array.from(v as Set<string>),
                })
              }
            >
              {tags.map((tag) => (
                <SelectItem key={tag}>{tag}</SelectItem>
              ))}
            </Select>
          </div>
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
      </form>
      <CatalogDuckTable<TableItem>
        isLoading={isMutating}
        columns={[
          {
            headerName: "Реквізити",
            colId: "full_code",
            cellRenderer: (row: { value: number }) => (
              <a
                href={`https://inspector.duckarchive.com/search?q=${row.value}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {row.value}
              </a>
            ),
          },
          { headerName: "Нас.пункт", field: "locations" },
          { headerName: "Рік", field: "years" },
          {
            headerName: "Теги",
            field: "tags",
            cellRenderer: (row: { value: string[] }) => (
              <>
                {row.value.map((tag) => (
                  <TagChip key={tag} label={tag} />
                ))}
              </>
            ),
          },
        ]}
        rows={searchResults || []}
      />
    </>
  );
};

export default Search;
