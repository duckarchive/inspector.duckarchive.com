"use client";
import { useState, useEffect } from "react";

import { usePost } from "@/hooks/useApi";
import useSearch from "@/hooks/useSearch";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import InspectorDuckTable from "@/components/table";
import { Accordion, Button, CloseButton, Input, InputGroup, Link, TextField } from "@heroui/react";
import { FaFolder, FaListUl, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import { Archives } from "@/data/archives";
import Select from "@/components/select";
import CoordinatesInput from "@/components/coordinates-input";
import useIsMobile from "@/hooks/useIsMobile";
import TagsInput from "@/components/tags-input";
import isEmpty from "lodash/isEmpty.js";

const ONLINE_TAG = "доступні онлайн копії";

type TableItem = SearchResponse[number];

interface SearchProps {
  archives: Archives;
  tags: string[];
}

const Search: React.FC<SearchProps> = ({ archives, tags }) => {
  const isMobile = useIsMobile();
  const [defaultValues, setQueryParams] = useSearch(archives);
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);
  const { trigger, isMutating, data: searchResults } = usePost<SearchResponse, SearchRequest>(`/api/search`);

  useEffect(() => {
    if (!isEmpty(searchValues)) {
      trigger(searchValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQueryParams(searchValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValues]);

  const handleInputChange = (key: keyof SearchRequest) => (value: string) => {
    setSearchValues({ ...searchValues, [key]: value });
  };

  const handleYearChange = (key: "year_from" | "year_to") => (value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handlePlaceInputChange = (value: string) => {
    if (searchValues.lat || searchValues.lng) {
      const isConfirmed = window.confirm("Поля 'Широта' та 'Довгота' будуть очищені. Продовжити?");
      if (!isConfirmed) {
        return;
      }
    }
    setSearchValues({ ...searchValues, lat: undefined, lng: undefined, radius_m: undefined, place: value });
  };

  // Place name and coordinates are alternative ways to say the same thing, and the
  // API honours only one of them — picking a point on the map drops the place name.
  const handleCoordinatesChange = (value: Pick<SearchRequest, "lat" | "lng" | "radius_m">) => {
    const hasPoint = Boolean(value.lat && value.lng);
    setSearchValues((prev) => ({ ...prev, ...value, place: hasPoint ? undefined : prev.place }));
  };

  const handleTagsChange = (values: string[]) => {
    if (values.includes(ONLINE_TAG)) {
      values = values.filter((v) => v !== ONLINE_TAG);
      setSearchValues({ ...searchValues, is_online: true, tags: values.length > 0 ? values : undefined });
    } else {
      setSearchValues({ ...searchValues, is_online: false, tags: values.length > 0 ? values : undefined });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trigger(searchValues);
  };

  /* One control: the year fields share a single border, so the pair reads as a
     range rather than two unrelated inputs. -ml-px collapses the touching
     borders into one line; focus-within lifts the active field's ring above
     its neighbour. `form` is set because on mobile these render outside the
     <form>, inside the accordion. */
  const yearRange = (
    <div className="flex grow-0 shrink">
      <TextField
        type="number"
        className="min-w-0 relative focus-within:z-10"
        value={searchValues.year_from || ""}
        onChange={handleYearChange("year_from")}
      >
        <Input form="search-form" className="rounded-r-none" placeholder="Рік від" />
      </TextField>
      <TextField
        type="number"
        className="min-w-0 relative -ml-px focus-within:z-10"
        value={searchValues.year_to || ""}
        onChange={handleYearChange("year_to")}
      >
        <Input form="search-form" className="rounded-l-none" placeholder="Рік до" />
      </TextField>
    </div>
  );

  const filters = (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="select-archive" className="font-bold flex items-center">
          <FaFolder className="inline mr-1" />
          Реквізити
        </label>
        <Select
          id="select-archive"
          form="search-form"
          items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
          label="Архів"
          getKey={(a) => a.code}
          getTextValue={(a) => a.code}
          renderItem={(a) => (
            <div>
              <p>{a.code}</p>
              <p className="opacity-70 text-sm text-wrap">{a.title}</p>
            </div>
          )}
          value={searchValues.archive}
          onChange={(v) => setSearchValues({ ...searchValues, archive: v?.toString() || undefined })}
        />
        <div className="flex gap-2">
          <TextField className="min-w-0 flex-1" value={searchValues.fond || ""} onChange={handleInputChange("fond")}>
            <Input form="search-form" placeholder="Фонд" />
          </TextField>
          <TextField
            className="min-w-0 flex-1"
            value={searchValues.inventory || ""}
            onChange={handleInputChange("inventory")}
          >
            <Input form="search-form" placeholder="Опис" />
          </TextField>
          <TextField className="min-w-0 flex-1" value={searchValues.file || ""} onChange={handleInputChange("file")}>
            <Input form="search-form" placeholder="Справа" />
          </TextField>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="coordinates-input" className="font-bold flex items-center">
          <FaMapMarkerAlt className="inline mr-1" />
          Локація
        </label>
        <TextField id="coordinates-input" value={searchValues.place || ""} onChange={handlePlaceInputChange}>
          <InputGroup>
            <InputGroup.Input
              form="search-form"
              pattern="[Ѐ-ӿԀ-ԯ]+"
              placeholder="Назва населеного пункту"
            />
            {searchValues.place ? (
              <InputGroup.Suffix>
                <CloseButton
                  aria-label="Очистити населений пункт"
                  onPress={() => setSearchValues({ ...searchValues, place: undefined })}
                />
              </InputGroup.Suffix>
            ) : null}
          </InputGroup>
        </TextField>
        <CoordinatesInput
          isLoading={isMutating}
          year={searchValues.year_from || searchValues.year_to || undefined}
          value={{
            lat: searchValues.lat || undefined,
            lng: searchValues.lng || undefined,
            radius_m: searchValues.radius_m || undefined,
          }}
          onChange={handleCoordinatesChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-bold flex items-center">
          <FaListUl className="inline mr-1" />
          Теги
        </label>
        <TagsInput
          tags={[ONLINE_TAG, ...tags]}
          value={[searchValues.is_online ? ONLINE_TAG : null, ...(searchValues.tags || [])].filter(Boolean) as string[]}
          onSelectionChange={handleTagsChange}
        />
      </div>
    </>
  );

  return (
    <>
      <form id="search-form" className="flex gap-2" onSubmit={handleSubmit}>
        <TextField
          className="grow"
          value={searchValues.title || ""}
          onChange={handleInputChange("title")}
        >
          <Input placeholder="Заголовок справи" />
        </TextField>
        {/* On mobile the row keeps only the title and the submit button; the years
            move into the accordion below rather than disappearing. */}
        {isMobile ? null : yearRange}
        <Button type="submit" size="lg" className="basis-1/6 h-auto font-bold text-lg" isIconOnly={isMobile}>
          <FaSearch />
          {isMobile ? undefined : "Пошук"}
        </Button>
      </form>
      {/* Mobile: everything except the title and the submit button collapses into
          one accordion, so results stay near the top of the screen. Desktop keeps
          the persistent sidebar. */}
      {isMobile ? (
        <Accordion>
          <Accordion.Item id="search-filters">
            <Accordion.Heading>
              <Accordion.Trigger className="font-bold px-0">
                Фільтри
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-8 p-0">
                {yearRange}
                {filters}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}
      <div className="flex md:flex-row flex-col grow gap-4 mt-4">
        {isMobile ? null : <div className="flex flex-col gap-8 pb-8 basis-1/4 min-w-0 h-full">{filters}</div>}
        <div className="min-h-[75vh] md:min-h-[300px] grow flex flex-col">
          <InspectorDuckTable<TableItem>
            id="search-table"
            isLoading={isMutating}
            columns={[
              {
                headerName: "Результати",
                field: "full_code",
                flex: 1,
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: (row: { value: string; data: TableItem }) => (
                  <div className="flex flex-col py-2 gap-1">
                    <Link
                      href={`/archives/${row.value.replace(/\-/g, "/")}`}
                      className="text-lg leading-none font-bold inline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.data.title || "Без назви"}
                    </Link>
                    <div>
                      {row.value}
                      {row.data.is_online && <span className="opacity-60"> (доступні онлайн копії)</span>}
                    </div>
                  </div>
                ),
              },
              // {
              //   headerName: "Назва",
              //   field: "title",
              //   resizable: true,
              //   flex: 3,
              // },
              // {
              //   headerName: "Рік",
              //   field: "years",
              //   hide: isMobile,
              //   valueGetter: (row) =>
              //     row.data?.years
              //       .map((y) => (y.start_year === y.end_year ? y.start_year : `${y.start_year}-${y.end_year}`))
              //       .join(", "),
              // },
              // {
              //   headerName: "Теги",
              //   field: "tags",
              //   cellRenderer: (row: { value: string[] }) => (
              //     <>
              //       {row.value.map((tag) => (
              //         <TagChip key={tag} label={tag} />
              //       ))}
              //     </>
              //   ),
              // },
            ]}
            rows={searchResults || []}
          />
        </div>
      </div>
    </>
  );
};

export default Search;
