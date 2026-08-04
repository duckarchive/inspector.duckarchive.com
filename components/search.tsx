"use client";
import { useState, useEffect } from "react";

import { usePost } from "@/hooks/useApi";
import useSearch from "@/hooks/useSearch";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import InspectorDuckTable from "@/components/table";
import { Button, CloseButton, Input, InputGroup, Link, TextField } from "@heroui/react";
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

  const handleYearChange = (value: string) => {
    setSearchValues({ ...searchValues, year: value || undefined });
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

  return (
    <>
      <form id="search-form" className="flex gap-2" onSubmit={handleSubmit}>
        <TextField
          className="w-full"
          value={searchValues.title || ""}
          onChange={handleInputChange("title")}
        >
          <Input placeholder="Заголовок справи" />
        </TextField>
        {isMobile ? null : (
          <TextField type="number" className="basis-1/6 shrink-0" value={searchValues.year || ""} onChange={handleYearChange}>
            <Input placeholder="Рік" />
          </TextField>
        )}
        <Button type="submit" size="lg" className="basis-1/4 h-full font-bold text-lg" isIconOnly={isMobile}>
          <FaSearch />
          {isMobile ? undefined : "Пошук"}
        </Button>
      </form>
      <div className="flex md:flex-row flex-col grow gap-4 mt-4">
        <div className="flex flex-col gap-8 pb-8 basis-1/4 h-full">
          <div className="flex flex-col gap-2">
            <label htmlFor="coordinates-input" className="font-bold flex items-center">
              <FaMapMarkerAlt className="inline mr-1" />
              Локація
            </label>
            <TextField id="coordinates-input" value={searchValues.place || ""} onChange={handlePlaceInputChange}>
              <InputGroup>
                <InputGroup.Input
                  form="search-form"
                  pattern="[\u0400-\u04FF\u0500-\u052F]+"
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
              year={searchValues.year || undefined}
              value={{
                lat: searchValues.lat || undefined,
                lng: searchValues.lng || undefined,
                radius_m: searchValues.radius_m || undefined,
              }}
              onChange={handleCoordinatesChange}
            />
          </div>
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
              <TextField value={searchValues.fond || ""} onChange={handleInputChange("fond")}>
                <Input form="search-form" placeholder="Фонд" />
              </TextField>
              <TextField value={searchValues.inventory || ""} onChange={handleInputChange("inventory")}>
                <Input form="search-form" placeholder="Опис" />
              </TextField>
              <TextField value={searchValues.file || ""} onChange={handleInputChange("file")}>
                <Input form="search-form" placeholder="Справа" />
              </TextField>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-bold flex items-center">
              <FaListUl className="inline mr-1" />
              Теги
            </label>
            <TagsInput
              tags={[ONLINE_TAG, ...tags]}
              value={
                [searchValues.is_online ? ONLINE_TAG : null, ...(searchValues.tags || [])].filter(Boolean) as string[]
              }
              onSelectionChange={handleTagsChange}
            />
          </div>
          {/* <div className="w-full text-sm">
            <p className="text-warning">
              Нова пошукова форма є експериментальною. Якщо ви помітили некоректну роботу, будь ласка, повідомте
              в чаті <Link href="https://t.me/spravnakachka" target="_blank" className="text-sm">@spravnakachka</Link>.
            </p>
            <p>
              Результати пошуку можуть виглядати &quot;порожніми&quot;, через те, що назви та роки не заповнені на 100%, але це не впливає на
              основну функцію Інспектора ― пошук посилання на онлайн копію.
            </p>
          </div> */}
        </div>
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
