"use client";
import { Key, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";

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
  Description,
  Dropdown,
  Input,
  Label,
  Link,
  TextField,
} from "@heroui/react";
import { FaCalendar, FaFolder, FaLink, FaListUl, FaMapMarkerAlt, FaSearch, FaChevronDown, FaFeather } from "react-icons/fa";
import { Archives } from "@/data/archives";
import Select from "@/components/select";
import CoordinatesInput from "@/components/coordinates-input";
import useIsMobile from "@/hooks/useIsMobile";
import TagsInput from "@/components/tags-input";
import { useAuthors } from "@/hooks/useAuthors";
import { foldCodeInput, hasLatin, toCyrillicQuery } from "@/lib/translit";
import isEmpty from "lodash/isEmpty.js";

const ONLINE_TAG = "доступні онлайн копії";

type TableItem = SearchResponse[number];

/**
 * Presets for the match strictness. The percentage is what the user sees and
 * equals the pg_trgm word-similarity threshold × 100 the API gets as
 * `fuzziness`; 100 % = plain substring match (no `fuzziness` at all).
 * Labels and descriptions live in messages (search-page.fuzziness.*); every
 * description illustrates the same base word («Київ») so the five levels read
 * as one progression instead of five unrelated examples.
 */
const FUZZINESS_PERCENTS = [100, 90, 75, 50, 30];

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
  const t = useTranslations("search-page");
  const tTags = useTranslations("tags");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [defaultValues, setQueryParams] = useSearch(archives);
  const [searchValues, setSearchValues] = useState<SearchRequest>(defaultValues);
  // The author box is a free-text field with suggestions: the API matches
  // `author` against authors.title, so a half-typed name is a valid criterion
  // and picking a suggestion just fills the box with its full title.
  const [authorQuery, setAuthorQuery] = useState(defaultValues.author || "");
  // The API rejects Latin letters, so the suggestion request is transliterated;
  // the box keeps whatever the user typed until they submit.
  const { data: authorOptions } = useAuthors(authorQuery ? toCyrillicQuery(authorQuery, locale) : undefined);
  const { trigger, isMutating, data: searchResults } = usePost<SearchResponse, SearchRequest>(`/api/search`);

  // The catalog is Cyrillic and the API refuses Latin input, so every submit
  // path converts first (free text phonetically per locale, codes by glyph)
  // and the converted value replaces the field — the user always sees the
  // query that actually ran.
  const normalizeValues = (values: SearchRequest): SearchRequest => ({
    ...values,
    title: values.title ? toCyrillicQuery(values.title, locale) : values.title,
    place: values.place ? toCyrillicQuery(values.place, locale) : values.place,
    author: values.author ? toCyrillicQuery(values.author, locale) : values.author,
    fond: values.fond ? foldCodeInput(values.fond) : values.fond,
    inventory: values.inventory ? foldCodeInput(values.inventory) : values.inventory,
    file: values.file ? foldCodeInput(values.file) : values.file,
  });

  const submit = (values: SearchRequest) => {
    const next = normalizeValues(values);
    setSearchValues(next);
    if (next.author !== values.author) setAuthorQuery(next.author || "");
    if (hasSearchCriteria(next)) trigger(toSearchRequest(next));
  };

  useEffect(() => {
    if (hasSearchCriteria(searchValues)) {
      submit(searchValues);
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

  const handleAuthorInputChange = (value: string) => {
    setAuthorQuery(value);
    setSearchValues((prev) => ({ ...prev, author: value || undefined }));
  };

  // Select suppresses onInputChange for an exact option match (it would spend a
  // request re-searching the row just picked), so the pick has to write both.
  const handleAuthorSelect = (key: Key | null) => {
    const author = (authorOptions ?? []).find((a) => a.id === String(key ?? ""));
    if (!author) return;
    setAuthorQuery(author.title);
    setSearchValues((prev) => ({ ...prev, author: author.title }));
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
    // a changed strictness re-runs the search — but only if there is something to search for
    submit({ ...searchValues, fuzziness: Number((percent / 100).toFixed(2)) });
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
    submit(searchValues);
  };

  // Live preview of what a Latin query will be searched as, shown before the
  // user submits so the conversion is never a surprise.
  const titlePreview = searchValues.title && hasLatin(searchValues.title)
    ? toCyrillicQuery(searchValues.title, locale)
    : null;

  const filters = (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="select-archive" className="font-bold flex items-center">
          <FaCalendar className="inline mr-1" />
          {t("years-label")}
        </label>
        <div className="flex grow-0 shrink">
          <TextField
            type="number"
            className="min-w-0 relative focus-within:z-10"
            value={searchValues.year_from || ""}
            onChange={handleYearChange("year_from")}
          >
            <Input form="search-form" className="rounded-r-none" placeholder={t("year-from")} />
          </TextField>
          <TextField
            type="number"
            className="min-w-0 relative -ml-px focus-within:z-10"
            value={searchValues.year_to || ""}
            onChange={handleYearChange("year_to")}
          >
            <Input form="search-form" className="rounded-l-none" placeholder={t("year-to")} />
          </TextField>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="select-archive" className="font-bold flex items-center">
          <FaFolder className="inline mr-1" />
          {t("requisites-label")}
        </label>
        <Select
          id="select-archive"
          form="search-form"
          items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
          label={t("archive-label")}
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
            <Input form="search-form" placeholder={t("fond-placeholder")} />
          </TextField>
          <TextField
            className="min-w-0 flex-1"
            value={searchValues.inventory || ""}
            onChange={handleInputChange("inventory")}
          >
            <Input form="search-form" placeholder={t("inventory-placeholder")} />
          </TextField>
          <TextField className="min-w-0 flex-1" value={searchValues.file || ""} onChange={handleInputChange("file")}>
            <Input form="search-form" placeholder={t("file-placeholder")} />
          </TextField>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="select-author" className="font-bold flex items-center">
          <FaFeather className="inline mr-1" />
          {t("author-label")}
        </label>
        <Select
          id="select-author"
          form="search-form"
          items={authorOptions ?? []}
          label={t("author-select-label")}
          virtualized
          getKey={(a) => a.id}
          getTextValue={(a) => a.title}
          renderItem={(a) => a.title}
          inputValue={authorQuery}
          onInputChange={handleAuthorInputChange}
          onChange={handleAuthorSelect}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="coordinates-input" className="font-bold flex items-center">
          <FaMapMarkerAlt className="inline mr-1" />
          {t("location-label")}
        </label>
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
          {t("tags-label")}
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
          <Input className="text-lg md:text-xl" placeholder={t("query-placeholder")} />
          {titlePreview ? (
            <Description className="text-xs">{t("translit-hint", { query: titlePreview })}</Description>
          ) : null}
        </TextField>
        {/* Split button: submit on the left, the fuzziness presets behind the chevron.
            The chosen tolerance shows on the main button so it is never a hidden state. */}
        <ButtonGroup size="lg" className="basis-1/6 h-full shrink-0">
          <Button type="submit" className="h-full font-bold text-lg grow" isIconOnly={isMobile}>
            <FaSearch />
            {isMobile
              ? undefined
              : fuzzinessPercent < 100
                ? t("submit-match", { percent: fuzzinessPercent })
                : t("submit-full-match")}
          </Button>
          <Dropdown>
            <Button isIconOnly aria-label={t("fuzziness-aria")} className="h-full">
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
                  {FUZZINESS_PERCENTS.map((percent) => (
                    <Dropdown.Item
                      key={percent}
                      id={String(percent)}
                      textValue={t(`fuzziness-p${percent}-label`)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <Dropdown.ItemIndicator />
                        <Label>{t(`fuzziness-p${percent}-label`)}</Label>
                      </div>
                      <Description>{t(`fuzziness-p${percent}-description`)}</Description>
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
                {t("filters")}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-6 p-0">{filters}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}
      <div className="flex md:flex-row flex-col grow gap-4 mt-4">
        {isMobile ? null : <div className="flex flex-col gap-6 pb-8 basis-1/4 min-w-0 h-full">{filters}</div>}
        <div className="min-h-[75vh] md:min-h-[300px] grow flex flex-col">
          <InspectorDuckTable<TableItem>
            id="search-table"
            isLoading={isMutating}
            columns={[
              {
                headerName: t("results-header"),
                field: "full_code",
                flex: 1,
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: (row: { value: string; data: TableItem }) => {
                  const yearLabel = row.data.years?.length
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
                        {row.data.title || t("no-title")}
                      </Link>
                      <span className="font-mono text-sm">
                        {row.value}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {row.data.is_online ? (
                          <Chip size="sm" variant="primary" color="accent">
                            <FaLink />
                            {tTags.has(ONLINE_TAG) ? tTags(ONLINE_TAG) : ONLINE_TAG}
                          </Chip>
                        ) : null}
                        {yearLabel ? (
                          <Chip size="sm" variant="soft">
                            <FaCalendar />
                            {yearLabel}
                          </Chip>
                        ) : null}
                        {(row.data.tags ?? []).map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            {tTags.has(tag) ? tTags(tag) : tag}
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
