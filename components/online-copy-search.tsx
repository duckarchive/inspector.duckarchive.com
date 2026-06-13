"use client";
import { useEffect, useState } from "react";

import { usePost } from "@/hooks/useApi";
import { OnlineCopySearchRequest, OnlineCopySearchResponse } from "@/app/api/online-copy-search/route";
import InspectorDuckTable from "@/components/table";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Chip } from "@heroui/chip";
import { useTranslations } from "next-intl";
import useIsMobile from "@/hooks/useIsMobile";
import SelectArchive from "@/components/select-archive";
import { Archives } from "@/data/archives";
import { buildOnlineCopyQuery, parseOnlineCopyQuery } from "@/lib/online-copy-query";

type TableItem = OnlineCopySearchResponse[number];

const AVAILABILITY_COLORS = {
  PUBLIC: "success",
  RESTRICTED: "warning",
} as const;

interface OnlineCopySearchProps {
  defaultQuery: string;
  archives: Archives;
}

const OnlineCopySearch: React.FC<OnlineCopySearchProps> = ({ defaultQuery, archives }) => {
  const t = useTranslations("online-copy-search-page");
  const isMobile = useIsMobile();
  const parsed = parseOnlineCopyQuery(defaultQuery, archives);
  const [query, setQuery] = useState(parsed.query);
  const [archive, setArchive] = useState<string | undefined>(parsed.archive);
  const {
    trigger,
    isMutating,
    data: searchResults,
    error,
  } = usePost<OnlineCopySearchResponse, OnlineCopySearchRequest>("/api/online-copy-search");

  useEffect(() => {
    if (defaultQuery.trim()) {
      trigger({ q: defaultQuery.trim() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = buildOnlineCopyQuery(archive, query.trim());

    if (!q) {
      return;
    }

    window.history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
    trigger({ q });
  };

  return (
    <div className="flex flex-col grow gap-2">
      <form className="flex md:flex-row flex-col gap-2 items-stretch" onSubmit={handleSubmit}>
        <SelectArchive
          archives={archives}
          value={archive}
          onChange={(v) => setArchive(v?.toString() || undefined)}
          isClearable
          withoutTitle
          size="md"
          className="basis-1/6 shrink-0 min-w-[140px]"
        />
        <Input
          className="grow radius-sm text-sm"
          label={t("title")}
          size="md"
          placeholder="Р6193*-П____7"
          value={query}
          onValueChange={setQuery}
        />
        <Button
          type="submit"
          color="primary"
          size="md"
          className="shrink md:h-full font-bold text-lg"
          isLoading={isMutating}
        >
          {t("search-button")}
        </Button>
      </form>
      {error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : (
        <p className="text-sm opacity-60">{t("hint")}</p>
      )}
      <div className="min-h-[75vh] md:min-h-[300px] grow flex flex-col">
        <InspectorDuckTable<TableItem>
          id="online-copy-search-table"
          isLoading={isMutating}
          columns={[
            {
              headerName: t("parsed-column"),
              field: "parsed",
              flex: 1,
              cellRenderer: (row: { value: string }) => (
                <div className="flex flex-col py-2 leading-tight">
                  {row.value?.split("+++").map((line) => <span key={line}>{line}</span>)}
                </div>
              ),
            },
            {
              headerName: t("url-column"),
              field: "url",
              flex: 2,
              sortable: false,
              cellRenderer: (row: { value: string }) =>
                row.value ? (
                  <Link href={row.value} target="_blank" className="text-sm">
                    {row.value}
                  </Link>
                ) : null,
            },
            {
              headerName: t("availability-column"),
              field: "availability",
              flex: 1,
              cellRenderer: (row: { value: TableItem["availability"] }) => (
                <Chip size="sm" variant="flat" color={row.value ? AVAILABILITY_COLORS[row.value] : "default"}>
                  {row.value ? t(`availability-${row.value.toLowerCase()}`) : t("availability-unknown")}
                </Chip>
              ),
            },
          ]}
          rows={searchResults || []}
        />
      </div>
    </div>
  );
};

export default OnlineCopySearch;
