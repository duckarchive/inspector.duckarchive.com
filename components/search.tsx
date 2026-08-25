"use client";
import { useState, useEffect } from "react";

import { usePost } from "@/hooks/useApi";
import useSearch from "@/hooks/useSearch";
import { SearchRequest, SearchResponse } from "@/app/api/search/route";
import InspectorDuckTable from "@/components/table";
import type { Selection } from "@heroui/react";
import {
  Accordion,
  Button,
  ButtonGroup,
  Chip,
  CloseButton,
  Description,
  Dropdown,
  Input,
  InputGroup,
  Label,
  Link,
  TextField,
} from "@heroui/react";
import { FaCalendar, FaFolder, FaLink, FaListUl, FaMapMarkerAlt, FaSearch, FaChevronDown } from "react-icons/fa";
import { Archives } from "@/data/archives";
import Select from "@/components/select";
import CoordinatesInput from "@/components/coordinates-input";
import useIsMobile from "@/hooks/useIsMobile";
import TagsInput from "@/components/tags-input";
import isEmpty from "lodash/isEmpty.js";

const ONLINE_TAG = "доступні онлайн копії";

type TableItem = SearchResponse[number];

/**
 * Presets for the match strictness. The percentage is what the user sees and
 * equals the pg_trgm word-similarity threshold × 100 the API gets as
 * `fuzziness`; 100 % = plain substring match (no `fuzziness` at all).
 */
// Every description illustrates the same base word ("Київ") so the five levels
// read as one progression instead of five unrelated examples.
const FUZZINESS_OPTIONS = [
  { percent: 100, label: "100% — повний збіг", description: "Київ: Київ" },
  { percent: 90, label: "90% — кілька помилок", description: "Київ: Київ, Кийв, Кієв" },
  { percent: 75, label: "75% — схожі слова", description: "Київ: Києв, Киев, Київ, Киив" },
  { percent: 50, label: "50% — широкі варіації", description: "Київ: Києва, Києві, Києво-Печерська" },
  { percent: 30, label: "30% — мені пощастить", description: "Київ: Київський, Киянка, Кийчик, кінь" },
];

const DEFAULT_FUZZINESS_PERCENT = 90;
const fuzzinessToPercent = (fuzziness: SearchRequest["fuzziness"]) =>
  fuzziness === undefined ? DEFAULT_FUZZINESS_PERCENT : Math.round(Number(fuzziness) * 100);

const toSearchRequest = ({ fuzziness, ...rest }: SearchRequest): SearchRequest => {
  const percent = fuzzinessToPercent(fuzziness);

  return percent >= 100 ? rest : { ...rest, fuzziness: percent / 100 };
};

/** The form is worth sending only with an actual criterion — the tolerance alone is not one. */
const hasSearchCriteria = (values: SearchRequest) => {
  const criteria: SearchRequest = { ...values };
  delete criteria.fuzziness;
  return !isEmpty(criteria);
};

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
    if (hasSearchCriteria(searchValues)) {
      trigger(toSearchRequest(searchValues));
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

  const fuzzinessPercent = fuzzinessToPercent(searchValues.fuzziness);
  const handleFuzzinessChange = (keys: Selection) => {
    const percent =
      keys === "all" ? DEFAULT_FUZZINESS_PERCENT : Number(Array.from(keys)[0] ?? DEFAULT_FUZZINESS_PERCENT);
    const next = { ...searchValues, fuzziness: Number((percent / 100).toFixed(2)) };
    setSearchValues(next);
    // a changed strictness re-runs the search — but only if there is something to search for
    if (hasSearchCriteria(next)) trigger(toSearchRequest(next));
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
    if (hasSearchCriteria(searchValues)) trigger(toSearchRequest(searchValues));
  };

  const filters = (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="select-archive" className="font-bold flex items-center">
          <FaCalendar className="inline mr-1" />
          Роки
        </label>
        <div className="flex grow-0 shrink">
          <TextField
            type="number"
            className="min-w-0 relative focus-within:z-10"
            value={searchValues.year_from || ""}
            onChange={handleYearChange("year_from")}
          >
            <Input form="search-form" className="rounded-r-none" placeholder="Від" />
          </TextField>
          <TextField
            type="number"
            className="min-w-0 relative -ml-px focus-within:z-10"
            value={searchValues.year_to || ""}
            onChange={handleYearChange("year_to")}
          >
            <Input form="search-form" className="rounded-l-none" placeholder="До" />
          </TextField>
        </div>
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
            <InputGroup.Input form="search-form" pattern="[Ѐ-ӿԀ-ԯ]+" placeholder="Назва населеного пункту" />
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
        <TextField className="grow" value={searchValues.title || ""} onChange={handleInputChange("title")}>
          <Input className="text-lg md:text-xl" placeholder="Пошуковий запит" />
        </TextField>
        {/* Split button: submit on the left, the fuzziness presets behind the chevron.
            The chosen tolerance shows on the main button so it is never a hidden state. */}
        <ButtonGroup size="lg" className="basis-1/6 h-full shrink-0">
          <Button type="submit" className="h-full font-bold text-lg grow" isIconOnly={isMobile}>
            <FaSearch />
            {isMobile ? undefined : fuzzinessPercent < 100 ? `Збіг ${fuzzinessPercent}%` : "Повний збіг"}
          </Button>
          <Dropdown>
            <Button isIconOnly aria-label="Нечіткість пошуку" className="h-full">
              <ButtonGroup.Separator />
              <FaChevronDown />
            </Button>
            <Dropdown.Popover className="min-w-[280px]" placement="bottom end">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([String(fuzzinessPercent)])}
                onSelectionChange={handleFuzzinessChange}
                disallowEmptySelection
              >
                <Dropdown.Section>
                  {FUZZINESS_OPTIONS.map(({ percent, label, description }) => (
                    <Dropdown.Item
                      key={percent}
                      id={String(percent)}
                      textValue={label}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <Dropdown.ItemIndicator />
                        <Label>{label}</Label>
                      </div>
                      <Description>{description}</Description>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ButtonGroup>
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
              <Accordion.Body className="flex flex-col gap-8 p-0">{filters}</Accordion.Body>
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
                cellRenderer: (row: { value: string; data: TableItem }) => {
                  const yearLabel = row.data.years.length
                    ? row.data.years
                        .map((y) => (y.start_year === y.end_year ? `${y.start_year}` : `${y.start_year}–${y.end_year}`))
                        .join(", ")
                    : null;

                  return (
                    <div className="flex flex-col gap-1 py-3">
                      <Link
                        href={`/archives/${row.value.replace(/\-/g, "/")}`}
                        className="text-lg leading-tight font-bold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.data.title || "Без назви"}
                      </Link>
                      <span className="font-mono text-sm">
                        {row.value}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {row.data.is_online ? (
                          <Chip size="sm" variant="primary" color="accent">
                            <FaLink />
                            доступні онлайн копії
                          </Chip>
                        ) : null}
                        {yearLabel ? (
                          <Chip size="sm" variant="soft">
                            <FaCalendar />
                            {yearLabel}
                          </Chip>
                        ) : null}
                        {row.data.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  );
                },
              },
            ]}
            rows={searchResults || []}
          />
        </div>
      </div>
    </>
  );
};

export default Search;
